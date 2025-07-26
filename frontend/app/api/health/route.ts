export async function GET() {
  return Response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'context-cleanse-frontend',
    version: '1.0.0'
  });
} 