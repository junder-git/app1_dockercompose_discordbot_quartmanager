"""
Resume command for Discord bot
"""
import discord
from discord.ext import commands
import asyncio

@commands.command(name="resume", aliases=["unpause"])
async def resume_command(ctx):
    """
    Resume the currently paused song.
    
    Usage:
    !resume
    """
    # Delete command message after a short delay
    asyncio.create_task(ctx.message.delete(delay=ctx.bot.cleartimer))
    
    # Check if bot is in a voice channel in this guild
    voice_client = discord.utils.get(ctx.bot.voice_clients, guild=ctx.guild)
    if not voice_client or not voice_client.is_connected():
        message = await ctx.send("I'm not currently in a voice channel.")
        await message.delete(delay=ctx.bot.cleartimer)
        return
    
    # Check if user is in the same voice channel
    if not ctx.author.voice or ctx.author.voice.channel != voice_client.channel:
        message = await ctx.send("You need to be in the same voice channel to use this command.")
        await message.delete(delay=ctx.bot.cleartimer)
        return
    
    # Check if bot is paused
    if not voice_client.is_paused():
        message = await ctx.send("Playback is not currently paused.")
        await message.delete(delay=ctx.bot.cleartimer)
        return
        
    # Resume playback
    voice_client.resume()
    
    # Update control panels
    channel_id = str(voice_client.channel.id)
    await ctx.bot.update_control_panel(str(ctx.guild.id), channel_id)
    
    # Send response
    message = await ctx.send("▶️ Resumed playback")
    await message.delete(delay=ctx.bot.cleartimer)