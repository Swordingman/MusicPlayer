const cloudSongs = [
	{
		id: 1,
		title: '好运来',
		artist: '祖海',
		src: '/static/music/好运来.m4a',
		coverImgUrl: 'https://p2.music.126.net/9HMwjKJ28PkHp609d98dJQ==/109951169761022710.jpg?param=200y200'
	},
	{
		id: 2,
		title: '吟游诗人',
		artist: '陈奕迅',
		src: '/static/music/吟游诗人.m4a',
		coverImgUrl: 'https://p1.music.126.net/Po0tJTtv4aBaYozWlnojHg==/18546562139313276.jpg?param=200y200'
	},
	{
		id: 3,
		title: 'Allegro, Opus 3.3 a.m.',
		artist: '陈奕迅',
		src: '/static/music/Allegro, Opus 3.3 a.m..m4a',
		coverImgUrl: 'https://p1.music.126.net/Z-y8Z_Gah5CenWEetryS1A==/109951164575169193.jpg?param=200y200'
	},
	// 我们特意在这里加一首新歌，来测试“刷新”功能
	{
		id: 4,
		title: 'Life Goes On',
		artist: '陈奕迅',
		src: '/static/music/Life Goes On.m4a',
		coverImgUrl: 'https://p2.music.126.net/RmdCYKF2ZQiAlgFmcsIOeQ==/18958878997954526.jpg?param=200y200'
	},
];

const fetchSongsFromServer = () => {
	console.log(`【API】正在模拟从服务器获取数据……`);
	return new Promise((resolve) => {
		setTimeout(() => {
			console.log(`【API】成功获取数据！`);
			resolve(JSON.parse(JSON.stringify(cloudSongs)));
		}, 500);
	});
};

export {
	fetchSongsFromServer
};