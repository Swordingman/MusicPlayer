// services/database.js

const DB_NAME = 'MyMusicDB';
const DB_PATH = '_doc/music.db';

let initializationPromise = null;
let dbInitialized = false; // 新增初始化状态标志

/**
 * 真正的内部SQL执行函数（无初始化检查）
 */
const _rawExecuteSql = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        plus.sqlite.executeSql({
            name: DB_NAME, 
            sql, 
            data: params, 
            success: resolve, 
            fail: reject
        });
        // #endif
        // #ifndef APP-PLUS
        resolve([]);
        // #endif
    });
};

/**
 * 真正的内部SQL查询函数（无初始化检查）
 */
const _rawSelectSql = (sql, params = []) => {
     return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        plus.sqlite.selectSql({
            name: DB_NAME,
            sql,
            data: params,
            success: resolve,
            fail: reject
        });
        // #endif
        // #ifndef APP-PLUS
        resolve([]);
        // #endif
    });
};

const _internalInitAndUpgrade = () => {
    return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        plus.sqlite.openDatabase({
            name: DB_NAME,
            path: DB_PATH,
            success: async () => {
                console.log("【DB】数据库打开成功");
                try {
                    // 1. 创建基础表
                    const createTableSQL = `
                        CREATE TABLE IF NOT EXISTS songs (
                            "id" INTEGER PRIMARY KEY, 
                            "title" TEXT, 
                            "artist" TEXT, 
                            "src" TEXT, 
                            "coverImgUrl" TEXT,
                            "localPath" TEXT
                        )`;
                    await _rawExecuteSql(createTableSQL);
                    
                    // 2. 验证表是否创建成功
                    const tableCheck = await _rawSelectSql(
                        `SELECT name FROM sqlite_master WHERE type='table' AND name='songs'`
                    );
                    
                    if (tableCheck.length === 0) {
                        throw new Error("songs表创建失败");
                    }
                    
                    console.log('【DB】songs表验证成功');
                    dbInitialized = true; // 标记初始化完成
                    resolve(true);
                } catch (err) {
                    console.error("【DB】初始化失败:", err);
                    // 尝试关闭损坏的数据库连接
                    try {
                        plus.sqlite.closeDatabase({ name: DB_NAME });
                    } catch (e) {}
                    reject(err);
                }
            },
            fail: (err) => {
                console.error("【DB】数据库打开失败:", err);
                reject(err);
            }
        });
        // #endif
        
        // #ifndef APP-PLUS
        dbInitialized = true;
        console.log('【DB】非APP环境，跳过数据库初始化');
        resolve(true);
        // #endif
    });
};


const initDB = () => {
    if (!initializationPromise) {
        console.log("【DB】启动数据库初始化...");
        initializationPromise = _internalInitAndUpgrade()
            .catch(err => {
                console.error("【DB】初始化严重失败:", err);
                // 重置状态允许重试
                initializationPromise = null;
                throw err;
            });
    }
    return initializationPromise;
};


const _internalExecuteSql = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        if (!dbInitialized) {
            return reject(new Error("DB_NOT_INITIALIZED"));
        }
        plus.sqlite.executeSql({
            name: DB_NAME, 
            sql, 
            data: params, 
            success: resolve, 
            fail: reject
        });
        // #endif
        
        // #ifndef APP-PLUS
        resolve([]);
        // #endif
    });
};

const _internalSelectSql = (sql, params = []) => {
     return new Promise((resolve, reject) => {
        // #ifdef APP-PLUS
        plus.sqlite.selectSql({ name: DB_NAME, sql, data: params, success: resolve, fail: reject });
        // #endif
        // #ifndef APP-PLUS
        resolve([]);
        // #endif
    });
};


/**
 * 核心改动 3：公开的 executeSql 和 selectSql 必须等待初始化完成
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
const executeSql = async (sql, params = []) => {
    // 确保数据库已初始化
    await initDB();
    
    if (!dbInitialized) {
        throw new Error("数据库未初始化");
    }
    
    return _rawExecuteSql(sql, params);
};

/**
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
const selectSql = async (sql, params = []) => {
    // 确保数据库已初始化
    await initDB();
    
    if (!dbInitialized) {
        throw new Error("数据库未初始化");
    }
    
    return _rawSelectSql(sql, params);
};


// **业务函数保持不变，因为它们的依赖 (executeSql, selectSql) 已经变得健壮了**
const getSongsFromDB = () => {
	console.log('【DB】尝试从本地数据库加载歌曲...');
	return selectSql('SELECT * FROM songs');
};

const saveSongsToDB = async (songs) => {
	try {
		await executeSql('BEGIN TRANSACTION;');
		await executeSql('DELETE FROM songs');
		console.log('【DB】旧歌曲数据已清空');
		for (const song of songs) {
			const insertSQL = 'INSERT INTO songs (id, title, artist, src, coverImgUrl, localPath) VALUES (?, ?, ?, ?, ?, ?)';
			await executeSql(insertSQL, [song.id, song.title, song.artist, song.src, song.coverImgUrl, song.localPath || null]);
		}
		console.log(`【DB】${songs.length} 首新歌曲已存入数据库`);
		await executeSql('COMMIT TRANSACTION;');
		return '歌曲批量保存成功';
	} catch (error) {
		console.error('【DB】批量保存歌曲失败:', error);
		await executeSql('ROLLBACK TRANSACTION;');
		throw error;
	}
};

const updateSongLocalPath = (songId, localPath) => {
    const sql = "UPDATE songs SET localPath = ? WHERE id = ?";
    return executeSql(sql, [localPath, songId]);
};

// 导出所有需要被外部调用的方法
export {
	initDB, // 仍然导出，以便在 App.vue onLaunch 中主动触发，让数据库尽快就绪
	getSongsFromDB,
	saveSongsToDB,
	updateSongLocalPath
};