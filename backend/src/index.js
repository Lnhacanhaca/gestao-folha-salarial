const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { errorHandler } = require('./shared/middlewares/errorHandler');

dotenv.config();

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.setupMiddlewares();
    this.setupModules();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
  }

  setupModules() {
    // Modules will be registered here
    this.app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
    this.app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
    
    // Auth Module
    const authRoutes = require('./modules/auth/auth.routes');
    this.app.use('/api/auth', authRoutes);

    // Users Module
    const userRoutes = require('./modules/users/users.routes');
    this.app.use('/api/users', userRoutes);

    // Docentes Module
    const docenteRoutes = require('./modules/docentes/docente.routes');
    this.app.use('/api/docentes', docenteRoutes);

    // Folhas Module
    const folhaRoutes = require('./modules/folhas/folha.routes');
    this.app.use('/api/folhas', folhaRoutes);

    // Audit Module
    const auditRoutes = require('./modules/audit/audit.routes');
    this.app.use('/api/audit', auditRoutes);

    // Avisos Module
    const avisosRoutes = require('./modules/avisos/avisos.routes');
    this.app.use('/api/avisos', avisosRoutes);

    // Admin Module (Config/Backup/Restore)
    const adminRoutes = require('./modules/admin/admin.routes');
    this.app.use('/api/admin', adminRoutes);
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 SGFS Backend running on port ${this.port}`);
    });
  }
}

const app = new App();
app.start();
