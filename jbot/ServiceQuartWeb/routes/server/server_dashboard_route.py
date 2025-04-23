"""
Server dashboard route
"""
from quart import render_template, redirect, url_for, request, current_app
from ...helpers import login_required, get_voice_channels, get_user_voice_channel, get_queue_and_bot_state
from ...forms.music_control_form import MusicControlForm
from ...forms.search_form import SearchForm
from ...forms.shuffle_queue_form import ShuffleQueueForm
from ...forms.url_form import UrlForm
from ...forms.clear_queue_form import ClearQueueForm
from ...forms.add_multiple_form import AddMultipleForm

@login_required
async def server_dashboard_route(guild_id):
    """
    Server dashboard for viewing voice channels and music status
    
    Args:
        guild_id (str): The Discord guild ID
        
    Returns:
        Response: Rendered server dashboard or redirect to main dashboard
    """
    discord = current_app.discord
    
    # Get guild info
    user_guilds = await discord.fetch_guilds()
    guild_info = next((g for g in user_guilds if str(g.id) == guild_id), None)
    
    if not guild_info:
        return redirect(url_for('dashboard.dashboard_route'))
    
    # Get voice channels
    voice_channels = await get_voice_channels(guild_id)
    
    # Get user's voice channel
    user = await discord.fetch_user()
    user_id = str(user.id)
    user_voice_channel = await get_user_voice_channel(guild_id, user_id)
    
    # Get current selected channel (if any)
    selected_channel_id = request.args.get('channel_id', None)
    
    # If no channel is selected but user is in a voice channel, use that
    if not selected_channel_id and user_voice_channel:
        selected_channel_id = user_voice_channel['id']
    
    # Get queue for selected channel (if applicable)
    queue_info, bot_state = await get_queue_and_bot_state(guild_id, selected_channel_id)
    
    # Initialize all forms
    music_control_form = MusicControlForm()
    search_form = SearchForm()
    shuffle_queue_form = ShuffleQueueForm()
    url_form = UrlForm()
    clear_queue_form = ClearQueueForm()
    add_multiple_form = AddMultipleForm()
    
    # Set default values    
    if selected_channel_id:
        music_control_form.channel_id.data = selected_channel_id
        search_form.channel_id.data = selected_channel_id
        shuffle_queue_form.channel_id.data = selected_channel_id
        url_form.channel_id.data = selected_channel_id
        add_multiple_form.channel_id.data = selected_channel_id
    
    clear_queue_form.guild_id.data = guild_id
    
    # Safe attribute access
    guild_icon = getattr(guild_info, 'icon', None)
    guild_name = getattr(guild_info, 'name', f"Server {guild_id}")
    
    return await render_template(
        'servers_dashboard.html',
        guild_id=guild_id,
        guild_name=guild_name,
        guild_icon=guild_icon,
        voice_channels=voice_channels,
        search_results=[],  # Empty initially, use search route for results
        selected_channel_id=selected_channel_id,
        user_voice_channel=user_voice_channel,
        queue=queue_info.get("queue", []),
        current_track=queue_info.get("current_track"),
        bot_state=bot_state,
        # Forms
        music_control_form=music_control_form,
        search_form=search_form,
        shuffle_queue_form=shuffle_queue_form,
        url_form=url_form,
        clear_queue_form=clear_queue_form,
        add_multiple_form=add_multiple_form
    )