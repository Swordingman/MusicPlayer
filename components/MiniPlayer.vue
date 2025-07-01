<template>
	<view class="mini-player-container" v-if="playerStore.currentSong.id">
		<view class="song-info">
			<image 
				class="album-cover" 
				:class="{ 'is-Playing': playerStore.isPlaying }" 
				:src="playerStore.currentSong.coverImgUrl" 
				mode="aspectFill">
			</image>
			
			<view class="text-info">
				<text class="song-title">{{ playerStore.currentSong.title }}</text>
				<text class="song-artist">{{ playerStore.currentSong.artist }}</text>
			</view>
		</view>
		
		<view class="controls">
			<uni-icons
				v-if="!playerStore.isPlaying"
				@tap="playerStore.play()"
				custom-prefix="iconfont"
				type="icon-bofang"
				size="30"
				color="#333"
			></uni-icons>
			<uni-icons
				v-else
				@tap="playerStore.pause()"
				custom-prefix="iconfont"
				type="icon-zanting1"
				size="30"
				color="#333"
			></uni-icons>
			<uni-icons
				@tap="showPlaylist"
				custom-prefix="iconfont"
				type="icon-liebiao"
				size="30"
				color="#333"
			></uni-icons>
		</view>
	</view>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player';

const playerStore = usePlayerStore();

const showPlaylist = () => {
	console.log("显示播放列表");
	uni.navigateTo({
		url: '/pages/player/player'
	});
};
</script>

<style lang = "scss">
@import "@/static/iconfont.css";

.mini-player-container {
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 60px;
	background-color: rgba(255,255,255,0.9);
	backdrop-filter: blur(10px);
	border-top: 1px solid #eee;
	z-index: 999;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 15px;
	box-sizing: border-box;
}

.song-info {
	display: flex;
	align-items: center;
	gap: 10px;
}

.album-cover {
	width: 45px;
	height: 45px;
	border-radius: 50%;
	animation: rotate 20s linear infinite;
	animation-play-state: paused;
}
.almub-cover.is-playing {
	animation-play-state: running;
}

.text-info {
	display: flex;
	flex-direction: column;
}

.song-title {
	font-size: 14px;
	font-weight: bold;
}
.song-artist {
	font-size: 12px;
	color: #666;
}

.controls {
	display: flex;
	align-items: center;
	gap: 15px;
}

@keyframes rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>