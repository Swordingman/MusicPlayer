<!-- pages/player/player.vue (现在是纯粹的详情页) -->
<template>
	<view class="container">
		<!-- 背景效果，现在能正常工作了 -->
		<image class="background-image" :src="playerStore.currentSong.coverImgUrl || defaultCover" mode="aspectFill"></image>
		<view class="background-mask"></view>

		<!-- 关键改动：v-if! 只有当有歌曲在播放时，才显示详情播放器 -->
		<view class="player-wrapper" v-if="playerStore.currentSong.id">
			<view class="current-song-info">
				<image class="album-cover" :class="{'is-playing': playerStore.isPlaying}" :src="playerStore.currentSong.coverImgUrl" mode="aspectFill"></image>
				<text class="song-title">{{ playerStore.currentSong.title }}</text>
				<text class="song-artist">{{ playerStore.currentSong.artist }}</text>
			</view>
			
			<view class="progress-bar">
				<text class="time-text">{{ playerStore.formattedCurrentTime }}</text>
				<slider 
					class="progress-slider"
					:value="playerStore.progress"
					@change="onSliderChange"
					@changing="onSliderChanging"
					block-size="16" 
					:max="100" 
					active-color="#fff"  
					background-color="rgba(255,255,255,0.3)"
					block-color="#fff"></slider>
				<text class="time-text">{{ playerStore.formattedDuration }}</text>
			</view>
			
			<view class="controls">
				<uni-icons @tap="playerStore.changePlayMode()" :type="playModeIcon" size="25" color="#eee"></uni-icons>
				<view class="main-controls">
					<uni-icons @tap="playerStore.prevSong()" custom-prefix="iconfont" type="icon-shangyishou" size="35" color="#ffffff"></uni-icons>
					<uni-icons v-if="!playerStore.isPlaying" @tap="playerStore.play()" custom-prefix="iconfont" type="icon-bofang" size="35" color="#ffffff"></uni-icons>
					<uni-icons v-else @tap="playerStore.pause()" custom-prefix="iconfont" type="icon-zanting1" size="35" color="#ffffff"></uni-icons>
					<uni-icons @tap="playerStore.nextSong()" custom-prefix="iconfont" type="icon-xiayishou" size="35" color="#ffffff"></uni-icons>
				</view>
				<!-- 这里可以放一个“分享”或“收藏”图标 -->
				<view class="placeholder-icon" style="width: 25px;"></view>
			</view>
		</view>

        <!-- 如果没有歌曲播放，显示提示信息 -->
        <view class="placeholder-view" v-else>
            <text class="placeholder-text">暂无播放歌曲</text>
            <text class="placeholder-tip">请从首页进入播放列表</text>
        </view>
		
		<!-- 歌曲列表部分保持不变 -->
		<view class="song-list">
			<view class="list-header">
				<view class="list-title">当前播放列表</view>
				<button @tap="refreshSongList" size="mini" :loading="isSyncing">{{ isSyncing ? '同步中…' : '刷新' }}</button>
			</view>
			<view v-for="(song, index) in playerStore.playlist" :key="song.id" class="song-item" :class="{ 'active-song': index === playerStore.currentIndex }" @tap="selectAndPlay(song, index)">
				<text>{{ song.title }} - {{ song.artist }}</text>
			</view>
		</view>
	</view>
</template>

<script setup lang='ts'>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { usePlayerStore } from '@/stores/player';
import { fetchPlaylistSongs } from '@/services/apiService.js';
import type { Song } from '@/types/Song';

const playerStore = usePlayerStore();
const isSyncing = ref(false);
const defaultCover = ref('/static/logo.png');

onLoad(async () => {
    if (playerStore.playlist.length === 0) {
        await syncWithServer();
    }
});

const syncWithServer = async () => {
	isSyncing.value = true;
	const hotPlaylistId = 8645455210; 
	const serverSongs = await fetchPlaylistSongs(hotPlaylistId);
	if (serverSongs && serverSongs.length > 0) {
        // **关键：调用 store 的 action 来更新播放列表**
		playerStore.updatePlaylist(serverSongs);
        uni.showToast({ title: '列表已更新', icon: 'success' });
	} else {
		uni.showToast({ title: '未能获取到歌曲', icon: 'none' });
	}
	isSyncing.value = false;
};

const refreshSongList = () => {
    syncWithServer();
};

const selectAndPlay = (song: Song, index: number) => {
    playerStore.selectSong(song, index);
};

const onSliderChanging = (e: any) => {
    // 这个可以保留在页面，因为它只影响UI表现，不涉及核心逻辑
    const progress = e.detail.value;
    const time = (progress / 100) * playerStore.duration;
    // 可以在这里更新一个临时的显示时间，以获得更好的拖动体验
};

const onSliderChange = (e: any) => {
    const newProgress = e.detail.value;
    playerStore.seek(newProgress);
};

const playModeIcon = computed(() => {
	if (playerStore.playMode === 'single') return 'icon-danquxunhuan';
	if (playerStore.playMode === 'shuffle') return 'icon-suijibofang';
	return 'icon-shunxubofang';
});
</script>

<style lang="scss" scoped>
@import "@/static/iconfont.css";
@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.placeholder-view {
    position: relative;
    z-index: 3;
    text-align: center;
    padding-top: 100px;
    padding-bottom: 50px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.placeholder-text {
    font-size: 22px;
    font-weight: bold;
    display: block;
    margin-bottom: 10px;
}
.placeholder-tip {
    font-size: 14px;
}

.container {
	padding: 0;
	font-family: Arial, sans-serif;
	display: flex;
	flex-direction: column;
	align-items: center;
	background: linear-gradient(to bottom, #e6f7ff, #ffffff);
	min-height: 100vh;
	position: relative;
	overflow: hidden;
}

.background-image {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1;
	
	filter: blur(40px);
	transform: scale(1.2);
	transition: all 0.5s ease-in-out;
}

.background-mask {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	background-color: rgba(0,0,0,0.2);
}

.player-wrapper,
.song-list {
	position: relative;
	z-index: 3;
}

.player-wrapper {
	padding: 40px 20px 20px;
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.current-song-info {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 20px;
	text-align: center;

	.album-cover {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		border: 4px solid #fff;
		box-shadow: 0 5px 15px rgba(0,0,0,0.1);
		margin-bottom: 10px;
		background-color: #eee;
		animation: rotate 20s linear infinite;
		animation-play-state: paused;
		transition: all 0.5s ease
	}
	
	.album-cover.is-playing {
		animation-play-state: running;
	}

	.song-title {
		font-size: 18px;
		font-weight: bold;
		margin-bottom: 5px;
		text-shadow: 0 1px 2px rgba(0,0,0,0.3)
	}

	.song-artist {
		font-size: 16px;
		color: #666;
		text-shadow: 0 1px 2px rgba(0,0,0,0.3);
	}
}

.controls {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 80%;
	margin: 20px;
}

.main-controls {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 20px;
}

.mode-icon, .placeholder-icon {
	width: 40px;
	text-align: center;
}

.progress-bar {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;

	.time-text {
		font-size: 12px;
		color: #666;
		width: 40px; // 固定宽度防止跳动
		text-align: center;
	}

	.progress-slider {
		flex: 1; // 占据剩余所有空间
		margin: 0 10px;
	}
}

.song-list {
	width: 100%;
	max-width: 100%;
	border: none;
	border-radius: 20px 20px 0 0;
	background-color: #ffffff;
	box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
	flex-grow: 1;
	
	.list-header{
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
		background-color: #f9f9f9;
		border-bottom: 1px solid #eee;
	}

	.list-title {
		font-weight: bold;
	}

	.song-item {
		padding: 10px;
		border-bottom: 1px solid #eee;
		cursor: pointer;

		&:last-child {
			border-bottom: none;
		}
		&:hover {
			background-color: #f0f0f0;
		}
	}

	.active-song {
		background-color: #e6f7ff;
		color: #1890ff;
		font-weight: bold;
	}
}

.lyric-icon {
	width: 40px;
	text-align: center;
}

.lyric-page-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0,0,0,0.8);
	z-index: 10;
	
	display: flex;
	justify-content: center;
	align-items: center;
	
	color: #fff;
	font-size: 20px;
}
</style>