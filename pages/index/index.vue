<!-- pages/index/index.vue (新的搜索中心) -->
<template>
	<view class="search-container">
		<!-- 1. 搜索栏 -->
		<view class="search-bar">
			<uni-easyinput
				prefixIcon="search"
				v-model="searchQuery"
				placeholder="搜索歌曲、歌手"
				@confirm="handleSearch"
				:inputBorder="false"
			></uni-easyinput>
			<button class="search-button" type="primary" size="mini" @tap="handleSearch" :loading="isLoading">搜索</button>
		</view>

		<!-- 2. 搜索结果列表 -->
		<scroll-view class="search-results" scroll-y="true">
			<!-- 加载状态 -->
			<view v-if="isLoading" class="loading-view">
				<uni-load-more status="loading"></uni-load-more>
			</view>
			
			<!-- 结果列表 -->
			<view v-else-if="searchResults.length > 0">
				<view 
					class="result-item" 
					v-for="(song, index) in searchResults" 
					:key="song.id" 
					@tap="playFromSearch(song, index)"
				>
					<view class="result-info">
						<text class="result-title">{{ song.title }}</text>
						<text class="result-artist">{{ song.artist }}</text>
					</view>
				</view>
			</view>

			<!-- 初始或无结果提示 -->
			<view v-else class="placeholder-view">
				<uni-icons type="music" size="60" color="#e0e0e0"></uni-icons>
				<text class="placeholder-text">发现好音乐</text>
			</view>
		</scroll-view>

		<!-- 3. 全局迷你播放器 -->
		<MiniPlayer />
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePlayerStore } from '@/stores/player';
import { searchSongs } from '@/services/apiService.js';
import type { Song } from '@/types/Song';
import MiniPlayer from '@/components/MiniPlayer.vue';

const playerStore = usePlayerStore();

// 搜索相关的本地状态
const searchQuery = ref('');
const searchResults = ref<Song[]>([]);
const isLoading = ref(false);

// 执行搜索的方法
const handleSearch = async () => {
	if (!searchQuery.value.trim()) {
		uni.showToast({ title: '请输入搜索内容', icon: 'none' });
		return;
	}
	
	isLoading.value = true;
	searchResults.value = []; // 清空旧结果
	
	const results = await searchSongs(searchQuery.value);
	searchResults.value = results;
	
	isLoading.value = false;
	
	if (results.length === 0) {
		uni.showToast({ title: '没有找到相关歌曲', icon: 'none' });
	}
};

// 从搜索结果点击播放的方法
const playFromSearch = (song: Song, index: number) => {
	// **关键逻辑：**
	// 1. 用当前的搜索结果，更新全局的播放列表
	playerStore.updatePlaylist(searchResults.value);
	
	// 2. 播放当前点击的这首歌
	playerStore.selectSong(song, index);
};
</script>

<style lang="scss" scoped>
.search-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f8f8f8;
}

.search-bar {
	display: flex;
	padding: 10px;
	background-color: #fff;
	border-bottom: 1px solid #eee;
	gap: 10px;
}
/* 覆盖 uni-easyinput 的默认样式 */
:deep(.uni-easyinput__content) {
	background-color: #f8f8f8 !important;
}

.search-button {
	display: flex;
	align-items: center;
}

.search-results {
	flex: 1;
	height: 0; // flex布局下的关键，让其自适应高度
}

.loading-view, .placeholder-view {
	padding-top: 100px;
	text-align: center;
	color: #999;
}
.placeholder-text {
	font-size: 16px;
	margin-top: 10px;
	display: block;
}

.result-item {
	padding: 15px;
	border-bottom: 1px solid #f0f0f0;
	background-color: #fff;
}

.result-cover {
	width: 50px;
	height: 50px;
	border-radius: 5px;
}

.result-info {
}

.result-title {
	font-size: 16px;
	color: #333;
	display: block;
	margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.result-artist {
	font-size: 12px;
	color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>