// services/apiService.js (原 mockAPI.js)

// 把这里换成你刚刚部署好的 Vercel 地址！
const API_BASE_URL = 'https://1343447392-8u4ppfp6gh.ap-guangzhou.tencentscf.com/'; 

/**
 * 封装一个 uni.request 的 Promise 版本
 * @param {object} options - uni.request 的参数
 * @returns {Promise<any>}
 */
const request = (options) => {
    return new Promise((resolve, reject) => {
        const requestUrl = API_BASE_URL + options.url;
        console.log("【Request】发起请求:", requestUrl); // 1. 打印将要请求的URL

        uni.request({
            url: requestUrl,
            timeout: 60000,
            success: (res) => {
                console.log("【Request】请求成功 (Success Callback):", res); // 2. 打印 success 回调的原始结果
                if (res.statusCode === 200) {
                    console.log("【Request】状态码 200，resolve data");
                    resolve(res.data);
                } else {
                    console.error("【Request】状态码非 200，reject response");
                    reject(res);
                }
            },
            fail: (err) => {
                console.error("【Request】请求失败 (Fail Callback):", err); // 3. 打印 fail 回调的错误
                reject(err);
            }
        });
    });
};

/**
 * 获取歌单详情
 * @param {number} id - 歌单的 ID
 * @returns {Promise<Song[]>}
 */
export const fetchPlaylistSongs = async (playlistId) => {
    try {
        console.log(`【API】正在从服务器获取歌单 #${playlistId} 的数据...`);
        const response = await request({
            url: `/playlist/track/all?id=${playlistId}&limit=50` // limit=50 表示最多获取50首歌
        });

        if (response && response.songs) {
            console.log('【API】成功获取到歌曲列表！');
            // 对返回的数据进行格式化，使其符合我们 App 内部的 Song 接口
            const formattedSongs = response.songs.map(song => ({
                id: song.id,
                title: song.name,
                artist: song.ar.map(artist => artist.name).join(' / '), // 处理多个歌手的情况
                src: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`, // 拼接可播放的 URL
                coverImgUrl: song.al.picUrl + '?param=200y200' // 专辑封面
            }));
            return formattedSongs;
        } else {
            return [];
        }
    } catch (error) {
        console.error("获取歌单详情失败:", error);
        return [];
    }
};

// 你还可以根据 API 文档封装其他接口，比如搜索
// export const searchSongs = async (keywords) => { ... }