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
		
		getPrivateDocPath(): string {
		  // #ifdef APP-PLUS
		  if (typeof plus.io.PRIVATE_DOC === 'number') {
		    // Android 返回数字常量，需转换为实际路径
		    return `_doc/`;
		  }
		  // iOS 直接返回字符串路径
		  return plus.io.PRIVATE_DOC.endsWith('/') 
		    ? plus.io.PRIVATE_DOC 
		    : plus.io.PRIVATE_DOC + '/';
		  // #endif
		  
		  // #ifndef APP-PLUS
		  return 'downloads/'; // 非APP环境默认路径
		  // #endif
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
			  
			try {
				// 获取正确的下载目录路径
				const targetDir = this.getPrivateDocPath() + 'CabbagePlayer/';
				console.log("下载目录:", targetDir);
				
				uni.showLoading({ title: '下载中...', mask: true });
				const downloadResult = await uni.downloadFile({ 
					url: this.currentSong.src, 
					timeout: 60000 
				});
				
			if (downloadResult.statusCode === 200) {
					const tempFilePath = downloadResult.tempFilePath;
				  
				  // 1. 确保目录存在
				await this.ensureDirectoryExists(targetDir);
				  
				  // 2. 生成安全文件名
				const fileName = this.generateSafeFileName(
					`${this.currentSong.artist} - ${this.currentSong.title}.mp3`
				);
				  
				// 3. 移动文件
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
			} else if (error.message.includes('路径')) {
				errorMsg += '存储路径错误';
			} else {
				errorMsg += error.message || '未知错误';
			}
				
				uni.showToast({ title: errorMsg, icon: 'none', duration: 5000 });
			}
		},

		// 确保目录存在
		async ensureDirectoryExists(path: string): Promise<void> {
		  // #ifdef APP-PLUS
		  console.log('确保目录存在:', path);
		  return new Promise((resolve, reject) => {
		    plus.io.requestFileSystem(
		      plus.io.PRIVATE_DOC,
		      (fs) => {
		        // 创建相对目录路径
		        const relPath = path.replace(this.getPrivateDocPath(), '').replace(/\/$/, '');
		        const segments = relPath.split('/').filter(p => p);
		        
		        const createDir = (root: any, parts: string[]) => {
		          if (parts.length === 0) return resolve();
		          
		          const dir = parts.shift()!;
		          root.getDirectory(
		            dir,
		            { create: true, exclusive: false },
		            (entry) => createDir(entry, parts),
		            (err) => reject(`创建目录失败: ${dir} (${JSON.stringify(err)})`)
		          );
		        };
		        
		        createDir(fs.root, segments);
		      },
		      (err) => reject(`文件系统错误: ${JSON.stringify(err)}`)
		    );
		  });
		  // #endif
		  
		  // #ifndef APP-PLUS
		  return Promise.resolve();
		  // #endif
		},

		// 移动文件
		moveFile(tempPath: string, targetDir: string, fileName: string): Promise<string> {
		  return new Promise(async (resolve, reject) => {
		    // #ifdef APP-PLUS
		    try {
		      // 确保目录存在
		      await this.ensureDirectoryExists(targetDir);
		      
		      // 直接使用文件系统API操作
		      plus.io.requestFileSystem(
		        plus.io.PRIVATE_DOC,
		        async (fs) => {
		          try {
		            // 获取目标目录
		            const dirEntry = await this.getDirectoryEntry(fs, 'CabbagePlayer');
		            
		            // 检查文件是否存在
		            let targetFileExists = false;
		            try {
		              await new Promise((res, rej) => {
		                dirEntry.getFile(fileName, { create: false }, res, rej);
		              });
		              targetFileExists = true;
		            } catch (e) {
		              // 文件不存在是正常情况
		            }
		            
		            // 如果存在则删除旧文件
		            if (targetFileExists) {
		              await new Promise<void>((res, rej) => {
		                dirEntry.getFile(
		                  fileName, 
		                  { create: false }, 
		                  (file) => file.remove(res, rej),
		                  rej
		                );
		              });
		            }
		            
		            // 移动文件
		            const savedPath = await new Promise<string>((res, rej) => {
		              plus.io.resolveLocalFileSystemURL(
		                tempPath,
		                (tempEntry) => {
		                  tempEntry.moveTo(
		                    dirEntry, 
		                    fileName, 
		                    (fileEntry) => res(fileEntry.toLocalURL()),
		                    (err) => rej(new Error(`移动文件失败: ${JSON.stringify(err)}`))
		                  );
		                },
		                (err) => rej(new Error(`解析临时文件失败: ${JSON.stringify(err)}`))
		              );
		            });
		            
		            resolve(savedPath);
		          } catch (error) {
		            reject(error);
		          }
		        },
		        (err) => reject(new Error(`文件系统错误: ${JSON.stringify(err)}`))
		      );
		    } catch (error) {
		      reject(error);
		    }
		    // #endif
		    
		    // #ifndef APP-PLUS
		    resolve(tempPath);
		    // #endif
		  });
		},
		
		// 辅助方法：获取目录Entry
		getDirectoryEntry(fs: any, dirName: string): Promise<any> {
		  return new Promise((resolve, reject) => {
		    fs.root.getDirectory(
		      dirName,
		      { create: true },
		      resolve,
		      (err) => reject(new Error(`获取目录失败: ${JSON.stringify(err)}`))
		    );
		  });
		},

		async checkPermission(): Promise<boolean> {
		  // #ifdef APP-PLUS
		  if (uni.getSystemInfoSync().platform === 'android') {
		    // 1. 使用 Promise<boolean> 更符合语义
		    const hasPermission = await new Promise<boolean>((resolve) => {
		      plus.android.requestPermissions(
		        ['android.permission.WRITE_EXTERNAL_STORAGE'],
		        (resultObj) => {
		          // 2. 核心修正：检查 resultObj 对象中对应权限的值
		          if (resultObj && resultObj['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted') {
		            console.log("【权限】存储权限已授予");
		            resolve(true);
		          } else {
		            console.warn("【权限】存储权限被拒绝");
		            resolve(false);
		          }
		        },
		        (error) => {
		          console.error('【权限】请求时发生错误:', error);
		          resolve(false); // 发生错误也视为无权限
		        }
		      );
		    });
		
		    // 3. 根据布尔值结果进行后续操作
		    if (!hasPermission) {
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
