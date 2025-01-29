import path from 'path'
import url from 'url'
import webpack from 'webpack'
import packageJson from '../package.json' with { type: 'json' }

const { ModuleFederationPlugin } = webpack.container

// Extract some properties from the package.json file to avoid duplication
const deps = packageJson.peerDependencies

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// For local testing
const CYWEB_NAME = 'cyweb'
const LOCAL_CYWEB = 'http://localhost:5500/remoteEntry.js'

// This port is used to run the development server
const DEV_SERVER_PORT = 5555

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
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'createNetwork',
      filename: 'remoteEntry.js',
      remotes: {
        // Import some data providers from the host application
        cyweb: `${CYWEB_NAME}@${LOCAL_CYWEB}`,
      },
      exposes: {
        './PatternApp': './src/PatternApp',
        './TemplatePanel': './src/components/TemplatePanel.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
        '@mui/material': {
          singleton: true,
          requiredVersion: deps['@mui/material'],
        },
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
