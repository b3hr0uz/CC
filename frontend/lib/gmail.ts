import { google, gmail_v1 } from 'googleapis'

export interface EmailData {
  id: string
  from: string
  subject: string
  preview: string
  date: string
  isRead: boolean
  threadId: string
}

// Simple in-memory cache with TTL
interface CacheEntry {
  data: EmailData[] | string
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: EmailData[] | string, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): EmailData[] | string | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export class GmailService {
  private gmail: gmail_v1.Gmail;
  private cache = new SimpleCache();
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  }

  async getEmails(maxResults: number = 20): Promise<EmailData[]> {
    try {
      // Check cache first with enhanced key
      const cacheKey = `emails:${maxResults}`
      const cachedEmails = this.cache.get(cacheKey)
      if (cachedEmails) {
        console.log(`📦 Cache hit for emails (${maxResults} results)`)
        return cachedEmails as EmailData[]
      }

      console.log(`🔄 Fetching ${maxResults} emails from Gmail API...`)
      const startTime = Date.now()

      // Get list of messages with optimized query and enhanced parameters
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox -is:chat', // Exclude chat messages for better performance
        includeSpamTrash: false, // Exclude spam/trash for faster queries
      })

      const messages = listResponse.data.messages || []
      
      if (messages.length === 0) {
        // Cache empty result to prevent repeated API calls
        this.cache.set(cacheKey, [], 1 * 60 * 1000) // 1 minute cache for empty results
        return []
      }

      // Enhanced batch processing with optimized size based on total messages
      const OPTIMAL_BATCH_SIZE = Math.min(15, Math.max(5, Math.ceil(messages.length / 4)))
      const emailBatches: gmail_v1.Schema$Message[][] = []
      
      for (let i = 0; i < messages.length; i += OPTIMAL_BATCH_SIZE) {
        emailBatches.push(messages.slice(i, i + OPTIMAL_BATCH_SIZE))
      }

      console.log(`📊 Processing ${messages.length} emails in ${emailBatches.length} batches of ~${OPTIMAL_BATCH_SIZE}`)

      const allEmails: EmailData[] = []

      // Process batches with enhanced parallel processing
      const batchResults = await Promise.allSettled(
        emailBatches.map(async (batch, batchIndex) => {
          const batchStartTime = Date.now()
          
          // Process each message in the batch in parallel
          const batchPromises = batch.map(async (message: gmail_v1.Schema$Message) => {
            try {
              // Use optimized format and fields to reduce data transfer
              const emailResponse = await this.gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'metadata', // Use metadata format first for faster initial load
                metadataHeaders: ['From', 'Subject', 'Date'], // Only get essential headers
              })

              const email = emailResponse.data
              const headers = email.payload!.headers!

              const fromHeader = headers.find((h) => h.name === 'From')
              const subjectHeader = headers.find((h) => h.name === 'Subject')
              const dateHeader = headers.find((h) => h.name === 'Date')

              // Get snippet separately if needed (more efficient)
              let preview = ''
              if (email.snippet) {
                preview = email.snippet
              } else {
                // Fallback: get minimal body content if no snippet
                try {
                  const fullResponse = await this.gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'minimal',
                  })
                  preview = fullResponse.data.snippet || ''
                } catch {
                  preview = 'No preview available'
                }
              }

              return {
                id: email.id!,
                from: this.extractEmailAddress(fromHeader?.value || 'Unknown Sender'),
                subject: subjectHeader?.value || 'No Subject',
                preview: preview.substring(0, 150) + (preview.length > 150 ? '...' : ''),
                date: dateHeader?.value || new Date().toISOString(),
                isRead: !email.labelIds?.includes('UNREAD'),
                threadId: email.threadId!,
              } as EmailData
            } catch (error) {
              console.error(`Error processing email ${message.id}:`, error)
              return null
            }
          })

          const batchResults = await Promise.allSettled(batchPromises)
          const successfulEmails = batchResults
            .filter((result): result is PromiseFulfilledResult<EmailData | null> => 
              result.status === 'fulfilled' && result.value !== null
            )
            .map(result => result.value!)

          const batchTime = Date.now() - batchStartTime
          console.log(`✅ Batch ${batchIndex + 1}/${emailBatches.length} completed: ${successfulEmails.length}/${batch.length} emails in ${batchTime}ms`)

          return successfulEmails
        })
      )

      // Collect all successful batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allEmails.push(...result.value)
        } else {
          console.error('Batch processing failed:', result.reason)
        }
      })

      // Sort emails by date (newest first) with enhanced sorting
      const sortedEmails = allEmails.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        
        // Handle invalid dates
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        
        return dateB - dateA
      })

      // Enhanced caching with longer TTL for larger result sets
      const cacheTTL = maxResults > 50 ? 5 * 60 * 1000 : 3 * 60 * 1000 // 5min for large sets, 3min for small
      this.cache.set(cacheKey, sortedEmails, cacheTTL)

      const endTime = Date.now()
      const avgTimePerEmail = Math.round((endTime - startTime) / sortedEmails.length)
      console.log(`✅ Fetched ${sortedEmails.length} emails in ${endTime - startTime}ms (avg: ${avgTimePerEmail}ms/email)`)

      return sortedEmails
    } catch (error: any) {
      console.error('Error fetching emails:', error)
      
      // Handle specific Gmail API errors
      if (error.code === 401 || error.status === 401) {
        throw new Error('Gmail authentication failed. Please sign out and sign in again to refresh your access.')
      } else if (error.code === 403 || error.status === 403) {
        throw new Error('Gmail access denied. Please check your Gmail permissions.')
      } else if (error.code === 429 || error.status === 429) {
        throw new Error('Gmail API rate limit exceeded. Please try again in a few minutes.')
      } else if (error.code >= 500 || error.status >= 500) {
        throw new Error('Gmail service is temporarily unavailable. Please try again later.')
      } else {
        throw new Error(`Failed to fetch emails from Gmail: ${error.message || 'Unknown error'}`)
      }
    }
  }

  async getEmailContent(messageId: string): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `content:${messageId}`
      const cachedContent = this.cache.get(cacheKey)
      if (cachedContent) {
        console.log(`📦 Cache hit for email content: ${messageId}`)
        return cachedContent as string
      }

      console.log(`🔄 Fetching email content for: ${messageId}`)
      const startTime = Date.now()

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      const payload = response.data.payload!
      let body = ''

      // Extract email body based on structure
      if (payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
      } else if (payload.parts) {
        // Handle multipart messages - prefer text/plain, fallback to text/html
        let htmlBody = ''
        
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8')
            break
          } else if (part.mimeType === 'text/html' && part.body?.data && !htmlBody) {
            htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
        }
        
        // If no plain text found, use HTML
        if (!body && htmlBody) {
          body = htmlBody
        }
      }

      // Use snippet as fallback if no body content found
      if (!body && response.data.snippet) {
        body = response.data.snippet
      }

      // Cache the content for longer since it doesn't change
      this.cache.set(cacheKey, body, 15 * 60 * 1000) // Cache for 15 minutes

      const endTime = Date.now()
      console.log(`✅ Fetched email content in ${endTime - startTime}ms`)

      return body
    } catch (error: any) {
      console.error('Error fetching email content:', error)
      
      // Handle specific Gmail API errors
      if (error.code === 401 || error.status === 401) {
        throw new Error('Gmail authentication failed. Please sign out and sign in again to refresh your access.')
      } else if (error.code === 403 || error.status === 403) {
        throw new Error('Gmail access denied. Please check your Gmail permissions.')
      } else if (error.code === 404 || error.status === 404) {
        throw new Error('Email not found or may have been deleted.')
      } else if (error.code === 429 || error.status === 429) {
        throw new Error('Gmail API rate limit exceeded. Please try again in a few minutes.')
      } else if (error.code >= 500 || error.status >= 500) {
        throw new Error('Gmail service is temporarily unavailable. Please try again later.')
      } else {
        throw new Error(`Failed to fetch email content: ${error.message || 'Unknown error'}`)
      }
    }
  }

  // Helper method to extract clean email address from header
  private extractEmailAddress(fromHeader: string): string {
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/)
    if (emailMatch) {
      return emailMatch[1]
    }
    
    // If no angle brackets, assume the whole string is the email
    const email = fromHeader.trim()
    return email.length > 50 ? email.substring(0, 47) + '...' : email
  }

  // Method to clear cache (useful for testing or memory management)
  clearCache(): void {
    this.cache.clear()
    console.log('🧹 Gmail cache cleared')
  }

  // Method to get cache stats
  getCacheStats(): { size: number } {
    return { size: this.cache.size() }
  }
}