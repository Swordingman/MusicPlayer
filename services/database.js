const DB_NAME = 'MyMusicDB';
const DB_PATH = '_doc/music.db';
let isOpen = false;

const executeSql = (sql, params = []) => {
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({
			name: DB_NAME,
			sql: sql,
			data: params,
			success: (res) => resolve(res),
			fail: (err) => reject(err)
		});
	});
};

const selectSql = (sql, params = []) => {
	return new Promise((resolve, reject) => {
		plus.sqlite.selectSql({
			name: DB_NAME,
			sql: sql,
			data: params,
			success: (res) => resolve(res),
			fail: (err) => {
				console.error('【DB】SQL查询失败：', err); 
				resolve([]);
				}
		});
	});
};

const initDB = () => {
	return new Promise((resolve, reject) => {
		if(isOpen) {
			resolve('数据库已打开');
			return;
		}
		
		plus.sqlite.openDatabase({
			name: DB_NAME,
			path: DB_PATH,
			success: () => {
				isOpen = true;
				console.log(`【DB】数据库打开成功`);
				const createTableSQL = `
				CREATE TABLE IF NOT EXISTS songs (
				"id" INTEGER PRIMARY KEY,
				"title" TEXT,
				"artist" TEXT,
				"src" TEXT,
				"coverImgUrl" TEXT
				)`;
				executeSql(createTableSQL).then(res => {
					console.log('【DB】songs表检查/创建成功');
					resolve('数据库初始化成功');
				}).catch(err => {
					console.error('【DB】songs表创建失败', err);
					reject(err);
				});
			},
			fail: (err) => {
				console.error('【DB】数据库打开失败:', err);
				reject(err);
			}
		});
	});
};

const getSongsFromDB = () => {
	console.log('【DB】尝试从本地数据库加载歌曲……');
	return selectSql('SELECT * FROM songs');
};

const saveSongsToDB = (songs) => {
	return new Promise(async (resolve, reject) => {
		try{
			await executeSql('BEGIN TRANSCATION;');
			await executeSql('DELETE FROM songs');
			console.log(`【DB】旧歌曲数据已清空`);
			for (const song of songs) {
				const insertSQL = 'INSERT INTO songs (id, title, artist, src, coverImgUrl) VALUES (?, ?, ?, ?, ?)';
				await executeSql(insertSQL, [song.id, song.title, song.artist, song.src, song.coverImgUrl]);}
				console.log('【DB】'+songs.length+'首新歌曲已存入数据库');
				await executeSql('COMMIT TRANSACATION;');
				resolve('歌曲批量保存成功');
			} catch (error) {
				console.error('【DB】批量保存歌曲失败:', error);
				await executeSql('ROLLBACK TRANSACTION;');
				reject(error);
			}
	});
};

export {
	initDB,
	getSongsFromDB,
	saveSongsToDB
};