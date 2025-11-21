import portfinder from 'portfinder';
import { WebServer } from './web-server';

const DEFAULT_PORT = 1024;
const DEFAULT_HOST = '127.0.0.1';

export async function runServer(opts: { cwd: string; contextCreateOpts: any }) {
  const { default: yargsParser } = await import('yargs-parser');
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      port: 'p',
      host: 'h',
    },
    number: ['port'],
    string: ['host'],
    boolean: ['read-only'], // 添加只读模式命令行参数
  });

  // 将只读模式配置添加到 contextCreateOpts 中
  const contextCreateOpts = {
    ...opts.contextCreateOpts,
    config: {
      ...opts.contextCreateOpts.config,
      readOnlyMode: argv.readOnly || false, // 从命令行参数获取只读模式配置
    },
  };

  const port = await portfinder.getPortPromise({
    port: Number.parseInt(String(argv.port || DEFAULT_PORT), 10),
  });

  const server = new WebServer({
    port,
    host: argv.host || DEFAULT_HOST,
    contextCreateOpts: contextCreateOpts,
    cwd: opts.cwd,
  });

  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n[WebServer] Shutting down...');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('[WebServer] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
