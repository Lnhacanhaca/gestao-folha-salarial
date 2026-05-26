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
    
    const authRoutes = require('./modules/auth/auth.routes');
    const usersRoutes = require('./modules/users/users.routes');
    const docentesRoutes = require('./modules/docentes/docente.routes');
    const folhasRoutes = require('./modules/folhas/folha.routes');
    const auditRoutes = require('./modules/audit/audit.routes');
    const avisosRoutes = require('./modules/avisos/avisos.routes');
    const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
    const settingsRoutes = require('./modules/settings/settings.routes');

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', usersRoutes);
    this.app.use('/api/docentes', docentesRoutes);
    this.app.use('/api/folhas', folhasRoutes);
    this.app.use('/api/audit', auditRoutes);
    this.app.use('/api/avisos', avisosRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);
    this.app.use('/api/settings', settingsRoutes);
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
