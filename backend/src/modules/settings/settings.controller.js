const db = require('../../config/database');
const { logAction } = require('../../shared/utils/auditLogger');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const backup = async (req, res, next) => {
  try {
    const client = db.client.config.client;
    
    await logAction({
      userId: req.user.id,
      username: req.user.username || req.user.nome || 'ADMIN',
      action: 'BACKUP_DATABASE',
      targetType: 'settings',
      details: `Iniciou o backup da base de dados (${client})`
    });

    if (client === 'sqlite3') {
      const fallbackDbPath = db.client.config.connection.filename || path.resolve(__dirname, '../../database/db.sqlite3');
      // Prefer standard sqlite file from knexfile
      let targetPath = fallbackDbPath;
      if (fallbackDbPath.startsWith('./')) {
        targetPath = path.resolve(process.cwd(), fallbackDbPath);
      }
      
      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ message: 'Banco de dados não encontrado em ' + targetPath });
      }

      res.download(targetPath, `backup_gestao_folha_${Date.now()}.sqlite`);
    } else if (client === 'pg') {
      const dumpFile = `/tmp/backup_gestao_folha_${Date.now()}.sql`;
      const dbUrl = process.env.DATABASE_URL;
      
      // pg_dump with --clean --if-exists ensures the restore will overwrite existing tables properly
      exec(`pg_dump "${dbUrl}" --clean --if-exists -F p -f "${dumpFile}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error backing up: ${stderr}`);
          return res.status(500).json({ message: 'Erro ao gerar backup PostgreSQL' });
        }
        res.download(dumpFile, `backup_gestao_folha_${Date.now()}.sql`, (err) => {
          if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
        });
      });
    } else {
      res.status(400).json({ message: 'Backup não suportado para este banco de dados.' });
    }
  } catch (error) {
    next(error);
  }
};

const restore = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Ficheiro de backup não enviado.' });
    }

    const client = db.client.config.client;

    await logAction({
      userId: req.user.id,
      username: req.user.username || req.user.nome || 'ADMIN',
      action: 'RESTORE_DATABASE',
      targetType: 'settings',
      details: `Iniciou o restore da base de dados (${client})`
    });

    if (client === 'sqlite3') {
      const fallbackDbPath = db.client.config.connection.filename || path.resolve(__dirname, '../../database/db.sqlite3');
      let targetPath = fallbackDbPath;
      if (fallbackDbPath.startsWith('./')) {
        targetPath = path.resolve(process.cwd(), fallbackDbPath);
      }

      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await db.destroy(); 
      fs.copyFileSync(req.file.path, targetPath);
      fs.unlinkSync(req.file.path);
      
      res.json({ message: 'Base de dados SQLite restaurada com sucesso. O servidor será reiniciado.' });
      setTimeout(() => process.exit(0), 1000);
      
    } else if (client === 'pg') {
      const dbUrl = process.env.DATABASE_URL;
      const uploadedFile = req.file.path;
      
      // psql restores the plain SQL dump
      exec(`psql "${dbUrl}" -f "${uploadedFile}"`, (error, stdout, stderr) => {
        if (fs.existsSync(uploadedFile)) fs.unlinkSync(uploadedFile);

        if (error) {
          console.error(`Error restoring: ${stderr}`);
          return res.status(500).json({ message: 'Erro ao restaurar banco PostgreSQL' });
        }
        
        res.json({ message: 'Base de dados PostgreSQL restaurada com sucesso. O servidor será reiniciado.' });
        setTimeout(() => process.exit(0), 1000);
      });

    } else {
      res.status(400).json({ message: 'Restore não suportado para este banco de dados.' });
    }

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

module.exports = { backup, restore };
