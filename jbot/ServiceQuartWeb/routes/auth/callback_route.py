"""
Callback route for Discord OAuth2
"""
import traceback
from quart import session, current_app, redirect, url_for

async def callback_route():
    """
    Callback route for Discord OAuth
    
    Returns:
        Response: Redirect to dashboard or home page
    """
    discord = current_app.discord
    
    try:
        # Complete the OAuth flow
        data = await discord.callback()
        
        # Get the user
        user = await discord.fetch_user()
        
        # Store user information in session
        session['user_id'] = user.id
        session['username'] = user.name
        
        # Also store the access token for further API calls
        if hasattr(discord, 'token'):
            session['discord_token'] = discord.token
        
        # Print debug information
        print(f"OAuth callback successful for user: {user.name} ({user.id})")
        print(f"Session after callback: {list(session.keys())}")
        
        # Fetch user guilds to verify API access is working
        try:
            guilds = await discord.fetch_guilds()
            print(f"Successfully fetched {len(guilds)} guilds for user")
        except Exception as e:
            print(f"Error fetching guilds: {e}")
        
        return redirect(url_for("dashboard.dashboard_route"))
    except Exception as e:
        print(f"Error in OAuth callback: {e}")
        # Log the full traceback for better debugging
        traceback.print_exc()
        # Clear the session on error to prevent loops
        session.clear()
        return redirect(url_for("index.index_route"))