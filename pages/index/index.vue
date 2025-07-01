<!-- pages/index/index.vue (我们的新主页) -->
<template>
	<view class="content">
		<view class="header">
			<image src="/static/logo.png" class="logo"></image>
			<text class="title">欢迎使用音乐播放器</text>
		</view>
		<view class="action-area">
			<button type="primary" @tap="goToPlayerPage">进入我的热歌榜</button>
		</view>

		<!-- MiniPlayer 只会出现在这里！ -->
		<MiniPlayer />
	</view>
</template>

<script setup lang="ts">
import MiniPlayer from '@/components/MiniPlayer.vue';

const goToPlayerPage = () => {
	uni.navigateTo({
		url: '/pages/player/player'
	});
};
</script>

<style lang="scss" scoped>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20px;
	height: 100vh;
	box-sizing: border-box;
}
.header {
	text-align: center;
	margin-bottom: 50px;
}
.logo {
	width: 80px;
	height: 80px;
	margin-bottom: 15px;
}
.title {
	font-size: 20px;
	color: #333;
}
</style>