import { defineStore } from 'pinia';
import type { Song } from '@/types/Song';

export const usePlayerStore = defineStore('player', {
	state: () => ({
		audioCtx: null as UniApp.BackgroundAudioManager | null,
		playlist: [] as Song[],
		
		isPlaying: false,
		currentSong: {} as Song | {},
		currentIndex: -1,
		
		currentTime: 0,
		duration: 0,
		progress: 0,
		isSeeking: false,
		
		playMode: 'loop' as 'loop' | 'single' | 'shuffle',
	}),
	
	getters: {
		currentSongId(state): number {
			return state.currentSong?.id || -1;
		},
		formattedCurrentTime(state): string {
			const formatTime = (seconds: number): string => {
				if (isNaN(seconds) || seconds < 0) { return '00:00'; }
				const min = Math.floor(seconds / 60);
				const sec = Math.floor(seconds %60);
				return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
			};
			return formatTime(state.currentTime);
		},
		formattedDuration(state): string {
			const formatTime = (seconds: number): string => {
				if (isNaN(seconds) || seconds < 0) { return '00:00' }
				const min = Math.floor(seconds / 60);
				const sec = Math.floor(seconds % 60);
				return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
			};
			return formatTime(state.duration);
		}
	},
	
	actions: {
		initializePlayer() {
		        if (this.audioCtx) return;
		
		        this.audioCtx = uni.getBackgroundAudioManager();
		        this.audioCtx.volume = 1; // 默认音量
		
		        this.audioCtx.onPlay(() => { this.isPlaying = true; });
		        this.audioCtx.onPause(() => { this.isPlaying = false; });
		        this.audioCtx.onEnded(() => { this.handleSongEnd(); }); // 调用一个新的 action
		        this.audioCtx.onError((err) => {
		            console.error('播放错误', err);
		            this.isPlaying = false;
		            uni.showToast({ title: '播放错误:' + (err.errMsg || '未知错误'), icon: 'none' });
		        });
		
		        this.audioCtx.onCanplay(() => {
		            if (this.audioCtx) {
		                this.duration = this.audioCtx.duration || 0;
		            }
		        });
		
		        this.audioCtx.onTimeUpdate(() => {
		            if (this.isSeeking) return;
		            if (this.audioCtx) {
		                this.currentTime = this.audioCtx.currentTime;
		                if (this.duration > 0) {
		                    this.progress = (this.currentTime / this.duration) * 100;
		                }
		            }
		        });
		
		        this.audioCtx.onPrev(() => { this.prevSong(); });
		        this.audioCtx.onNext(() => { this.nextSong(); });
		
		        console.log("【PlayerStore】背景音频播放器已初始化");
		    },
		    
		    // 2. 播放/暂停的 Action
		    play() {
		        if (!this.audioCtx) this.initializePlayer();
		        this.audioCtx?.play();
		    },
		    pause() {
		        this.audioCtx?.pause();
		    },
		
		    // 3. 选中歌曲并播放 (原 selectSong)
		    selectSong(song: Song, index: number) {
		        if (!this.audioCtx) this.initializePlayer();
		        
		        this.currentSong = song;
		        this.currentIndex = index;
		        
		        // 重置状态
		        this.currentTime = 0;
		        this.duration = 0;
		        this.progress = 0;
		        
		        if (this.audioCtx) {
		            this.audioCtx.title = song.title;
		            this.audioCtx.singer = song.artist;
		            this.audioCtx.coverImgUrl = song.coverImgUrl;
		            this.audioCtx.src = song.src;
		        }
		        // BackgroundAudioManager 在设置 src 后会自动播放，所以通常不需要手动调用 play()
		    },
		
		    // 4. 上一首/下一首 (逻辑完全一样，只是把 .value 去掉)
		    nextSong() {
		        if (this.playlist.length === 0) return;
		        if (this.playMode === 'shuffle') {
		            this.playShuffle();
		            return;
		        }
		        let newIndex = this.currentIndex + 1;
		        if (newIndex >= this.playlist.length) newIndex = 0;
		        this.selectSong(this.playlist[newIndex], newIndex);
		    },
		    prevSong() {
		        if (this.playlist.length === 0) return;
		        if (this.playMode === 'shuffle') {
		            this.playShuffle();
		            return;
		        }
		        let newIndex = this.currentIndex - 1;
		        if (newIndex < 0) newIndex = this.playlist.length - 1;
		        this.selectSong(this.playlist[newIndex], newIndex);
		    },
		    
		    // 5. 随机播放 (逻辑不变)
		    playShuffle() {
		        if (this.playlist.length <= 1) {
		            this.play();
		            return;
		        }
		        let randomIndex;
		        do {
		            randomIndex = Math.floor(Math.random() * this.playlist.length);
		        } while (randomIndex === this.currentIndex);
		        this.selectSong(this.playlist[randomIndex], randomIndex);
		    },
		    
		    // 6. 切换播放模式 (逻辑不变)
		    changePlayMode() {
		        if (this.playMode === 'loop') {
		            this.playMode = 'single';
		            uni.showToast({ title: '单曲循环', icon: 'none' });
		        } else if (this.playMode === 'single') {
		            this.playMode = 'shuffle';
		            uni.showToast({ title: '随机播放', icon: 'none' });
		        } else {
		            this.playMode = 'loop';
		            uni.showToast({ title: '列表循环', icon: 'none' });
		        }
		    },
		    
		    // 7. 处理歌曲自然播放结束 (原 onEnded 的核心逻辑)
		    handleSongEnd() {
		        this.isPlaying = false;
		        if (this.playMode === 'single') {
		            this.play(); // 直接重新播放
		        } else {
		            this.nextSong(); // 其他模式都视为下一首
		        }
		    },
		
		    // 8. 处理进度条拖动
		    seek(newProgress: number) {
		        if (!this.audioCtx || this.duration === 0) return;
		        const seekTime = (newProgress / 100) * this.duration;
		        this.audioCtx.seek(seekTime);
		        this.progress = newProgress;
		    },
		
		    // 9. 更新播放列表
		    updatePlaylist(songs: Song[]) {
		        this.playlist = songs;
		        console.log("【PlayerStore】播放列表已更新");
		    }
		}
});
