import { defineStore } from 'pinia';
import type { Song } from '@/types/Song';
import { fetchLyric, getSongDetail } from '../services/apiService';
import { updateSongLocalPath } from '../services/database';

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
		
		lyric: [] as { time: number; text: string }[],
		currentLyricIndex: -1,
		
		downloadProgress: 0,
		isDownloading: false,
		downloadTask: null as UniApp.DownloadTask | null,
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
					this.updateLyricIndex();
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
		async selectSong(song: Song, index: number) {
		    if (!this.audioCtx) this.initializePlayer();
		
		    this.currentIndex = index;
		    
		    if (song.localPath) {
		        console.log("【Player】播放本地文件:", song.localPath);
		        this.currentSong = song;
				
		        if (this.audioCtx) {
		            this.audioCtx.title = song.title;
		            this.audioCtx.singer = song.artist;
		            this.audioCtx.coverImgUrl = song.coverImgUrl;
		            this.audioCtx.src = song.localPath;
		        }
		    } else {
		        console.log("【Player】播放在线文件，并尝试补全信息……");
		        this.currentSong = song;
		        const detailedSong = await getSongDetail(song.id);
		        if (detailedSong) {
		            this.currentSong = detailedSong;
		            this.playlist[index] = detailedSong;
		            if (this.audioCtx) {
		                this.audioCtx.title = detailedSong.title;
		                this.audioCtx.singer = detailedSong.artist;
		                this.audioCtx.coverImgUrl = detailedSong.coverImgUrl;
		                this.audioCtx.src = detailedSong.src;
		            }
		        } else {
		            if (this.audioCtx) {
		                this.audioCtx.title = song.title;
		                this.audioCtx.singer = song.artist;
		                this.audioCtx.coverImgUrl = song.coverImgUrl;
		                this.audioCtx.src = song.src;
		            }
		        }
		    }
		    
		    this.currentTime = 0;
		    this.duration = 0;
		    this.progress = 0;
		    this.loadLyric();
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
		},
		
		async loadLyric() {
			if (!this.currentSong.id) return;
			
			const lrcString = await fetchLyric(this.currentSong.id);
			if (!lrcString) {
				this.lyric = [];
				return;
			}
			
			const lines = lrcString.split('\n');
			const parsedLyric = [];
			for (const line of lines) {
				const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
				if (match) {
					const min = parseInt (match[1], 10);
					const sec = parseInt (match[2], 10);
					const ms = parseInt (match[3], 10);
					const time = min * 60 + sec + ms / 1000;
					const text = match[4].trim() || '...';
					
					parsedLyric.push({ time, text });
				}
			}
			
			this.lyric = parsedLyric;
			console.log("【PlayerStore】歌词解析完成：", this.lyric);
		},
		
		updateLyricIndex() {
			if(!this.lyric || this.lyric.length === 0) return;
			
			let newIndex = -1;
			for (let i = 0; i < this.lyric.length; i++) {
				if (this.lyric[i].time <= this.currentTime) {
					newIndex = i;
				} else {
					break;
				}
			}
			
			if (newIndex !== this.currentLyricIndex) {
				this.currentLyricIndex = newIndex;
			}
		},
		
		async downloadCurrentSong() {
			if (!this.currentSong.id) {
				uni.showToast({ title: '当前无歌曲', icon: 'none' });
				return;
			}
			if (this.currentSong.localPath) {
				uni.showToast({ title: '歌曲已下载', icon: 'none' });
				return;
			}
			
			const hasPermission = await this.checkPermission();
			if (!hasPermission) {
				uni.showToast({ title: '无存储权限，无法下载', icon: 'none' });
				return;
			}
			
			const targetDir = `${plus.io.PUBLIC_DOWNLOADS}/CabbagePlayer/`;
		
			uni.showLoading({ title: '下载中...', mask: true });
		
			try {
				const downloadResult = await uni.downloadFile({ url: this.currentSong.src, timeout: 60000 });
				
				if (downloadResult.statusCode === 200) {
					const tempFilePath = downloadResult.tempFilePath;
					
					// 1. 确保目标目录存在
					await this.ensureDirectoryExists(targetDir);
					
					// 2. 生成安全的文件名
					const fileName = this.generateSafeFileName(
						`${this.currentSong.artist} - ${this.currentSong.title}.mp3`
					);
					
					// 3. 移动文件到目标位置
					const savedPath = await this.moveFile(tempFilePath, targetDir, fileName);
					
					// 4. 更新数据库和状态
					await updateSongLocalPath(this.currentSong.id, savedPath);
					this.currentSong.localPath = savedPath;
					const songInList = this.playlist.find(s => s.id === this.currentSong.id);
					if (songInList) songInList.localPath = savedPath;
					
					uni.hideLoading();
					uni.showToast({ title: '下载成功', icon: 'success' });
					
				} else {
					throw new Error(`下载失败，状态码: ${downloadResult.statusCode}`);
				}
			} catch (error) {
				console.error("下载失败详情:", error);
				uni.hideLoading();
				
				let errorMsg = '下载失败: ';
				if (error.message.includes('permission')) {
				  errorMsg += '请授予存储权限';
				} else if (error.message.includes('空间')) {
				  errorMsg += '存储空间不足';
				} else {
				  errorMsg += error.message || '未知错误';
				}
				
				uni.showToast({
				  title: errorMsg,
				  icon: 'none',
				  duration: 5000
				});
			}
		},
		
		// 确保目录存在
		async ensureDirectoryExists(path: string): Promise<void> {
		  return new Promise((resolve, reject) => {
		    // #ifdef APP-PLUS
		    plus.io.resolveLocalFileSystemURL(
		      path,
		      () => resolve(),
		      async () => {
		        try {
		          // 创建所有不存在的父目录
		          await new Promise((resolveParent, rejectParent) => {
		            plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
		              fs.root.getDirectory(
		                'CabbagePlayer',
		                { create: true, exclusive: false },
		                (dirEntry) => resolveParent(dirEntry),
		                (err) => rejectParent(err)
		              );
		            }, rejectParent);
		          });
		          resolve();
		        } catch (error) {
		          reject(error);
		        }
		      }
		    );
		    // #endif
		    
		    // #ifndef APP-PLUS
		    resolve();
		    // #endif
		  });
		},
		
		// 移动文件
		moveFile(tempPath: string, targetDir: string, fileName: string): Promise<string> {
			return new Promise((resolve, reject) => {
				// #ifdef APP-PLUS
				const targetDir = `${plus.io.PUBLIC_DOWNLOADS}/CabbagePlayer/`;
				
				console.log(`准备移动文件: 从 ${tempPath} 到 ${targetDir}${fileName}`);
		
				plus.io.resolveLocalFileSystemURL(targetDir,
					(dirEntry) => {
						// 1. 检查目标文件是否已存在
						dirEntry.getFile(fileName, { create: false },
							(targetFileEntry) => {
								// 如果 getFile 成功，说明文件已存在，需要先删除
								console.log("目标文件已存在，正在删除:", targetFileEntry.fullPath);
								targetFileEntry.remove(
									() => {
										console.log("旧文件删除成功，现在开始移动新文件...");
										// 删除成功后，再执行移动操作
										proceedToMove();
									},
									(removeError) => {
										console.error("删除旧文件失败:", JSON.stringify(removeError));
										reject(new Error(`覆盖旧文件失败: ${removeError.message}`));
									}
								);
							},
							(error) => {
								// 如果 getFile 失败 (通常是 code: 1, NOT_FOUND_ERR)，说明文件不存在，这是正常情况
								if (error.code === 1) {
									console.log("目标文件不存在，直接移动。");
									proceedToMove();
								} else {
									// 其他未预料的错误
									console.error("检查目标文件时发生未知错误:", JSON.stringify(error));
									reject(new Error(`检查目标文件状态失败: ${error.message}`));
								}
							}
						);
		
						// 2. 封装移动逻辑，避免代码重复
						const proceedToMove = () => {
							plus.io.resolveLocalFileSystemURL(tempPath,
								(tempFileEntry) => {
									tempFileEntry.moveTo(dirEntry, fileName,
										(finalEntry) => {
											const finalPath = finalEntry.toLocalURL();
											console.log("文件移动成功，最终路径:", finalPath);
											resolve(finalPath);
										},
										(moveError) => {
											console.error("文件移动错误详情:", JSON.stringify(moveError));
											reject(new Error(`移动文件失败: ${moveError.message}`));
										}
									);
								},
								(err) => reject(new Error(`解析临时文件失败: ${JSON.stringify(err)}`))
							);
						};
					},
					(err) => reject(new Error(`解析目标目录失败: ${JSON.stringify(err)}`))
				);
				// #endif
				
				// #ifndef APP-PLUS
				console.log("非APP环境，返回临时路径:", tempPath);
				resolve(tempPath);
				// #endif
			});
		},
		
		async checkPermission(): Promise<boolean> {
		  // #ifdef APP-PLUS
		  if (uni.getSystemInfoSync().platform === 'android') {
		    const status = await new Promise<number>((resolve) => { // 明确 Promise 的返回类型为 number
		      plus.android.requestPermissions(
		        ['android.permission.WRITE_EXTERNAL_STORAGE'],
		        (result) => {
		          // 关键修正：返回结果对象中的 code 属性
		          resolve(result.code); 
		        },
		        (error) => {
		          // 增加错误处理，防止 Promise 一直挂起
		          console.error('requestPermissions error:', error);
		          resolve(-1); // 返回一个非 0 的值表示失败
		        }
		      );
		    });
		    // status 现在是数字 0, 1, 或 -1
		    // status 为 0 表示权限已授予
		    if (status !== 0) {
		      console.warn(`存储权限请求失败，状态码: ${status}`);
		      // 可以在这里给用户更明确的提示
		      uni.showModal({
		        title: '权限申请',
		        content: '需要您的存储权限才能下载歌曲。请在系统设置中手动授权。',
		        showCancel: false
		      });
		      return false;
		    }
		    return true;
		  }
		  // #endif
		  // 对于非 Android App 环境（如 iOS 或 Web），默认认为有权限
		  return true;
		},
		
		// 生成安全的文件名
		generateSafeFileName(originalName: string): string {
		  // 更严格的非法字符过滤
		  return originalName
			.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '') // 移除控制字符和非法符号
			.replace(/\.$/, '') // 移除结尾的点
			.trim() // 移除首尾空格
			.substring(0, 100); // 限制文件名长度
		},
	}
});
