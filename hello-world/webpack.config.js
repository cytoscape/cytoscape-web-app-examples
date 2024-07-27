import path from 'path'
import url from 'url'
import webpack from 'webpack'
import packageJson from '../package.json' assert { type: 'json' }

const { ModuleFederationPlugin } = webpack.container

// Extract some properties from the package.json file to avoid duplication
const deps = packageJson.peerDependencies

const { name } = packageJson

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEV_SERVER_PORT = 2222

export default {
  mode: 'development',
  devtool: false,
  target: 'web',
  optimization: {
    minimize: false,
    runtimeChunk: false,
    splitChunks: {
      chunks: 'async',
      name: false,
    },
  },
  entry: './src/index.ts',
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist'),
    // publicPath: `http://localhost:${DEV_SERVER_PORT}/`,
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'hello',
      filename: 'remoteEntry.js',
      remotes: {
        // Import some data providers from the host application
        cyweb: 'cyweb@http://localhost:5500/remoteEntry.js',
      },
      exposes: {
        './HelloApp': './src/HelloApp',
        './HelloPanel': './src/components/HelloPanel.tsx',
        './SubPanel': './src/components/SubPanel.tsx',
        './MenuExample': './src/components/MenuExample.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    hot: true,
    port: DEV_SERVER_PORT,
    headers: {
      'Access-Control-Allow-Origin': '*', // allow access from any origin
    },
  },
}
