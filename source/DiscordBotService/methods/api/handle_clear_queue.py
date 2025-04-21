"""
handle_clear_queue method for Discord bot
Handles API requests to clear music queues
"""
from aiohttp import web

async def handle_clear_queue(self, request):
    """
    Handle requests to clear a queue
    
    Args:
        request: The HTTP request object
        
    Returns:
        web.Response: JSON response with result
    """
    # Check authorization
    if request.headers.get('Authorization') != f'Bearer {self.SECRET_KEY}':
        return web.json_response({"error": "Unauthorized"}, status=401)
    
    try:
        data = await request.json()
        guild_id = data.get('guild_id')
        channel_id = data.get('channel_id')  # Optional
        
        if not guild_id:
            return web.json_response({"error": "Missing guild_id parameter"}, status=400)
        
        # Use the shared clear_queue method
        result = await self.clear_queue(guild_id, channel_id)
        
        return web.json_response(result)
        
    except Exception as e:
        print(f"Error handling clear_queue request: {e}")
        return web.json_response({"error": str(e)}, status=500)