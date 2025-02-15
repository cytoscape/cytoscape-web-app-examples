import path from 'path'
import url from 'url'
import webpack from 'webpack'
import packageJson from '../package.json' with { type: 'json' }

const { ModuleFederationPlugin } = webpack.container

// Extract some properties from the package.json file to avoid duplication
const deps = packageJson.peerDependencies

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEV_SERVER_PORT = 4001

export default (env = {}) => {
  // Extract the environment variables to modify URLs and other settings
  const isProduction = env.production || false
  const cywebUrl = isProduction
    ? 'cyweb@https://web.cytoscape.org/remoteEntry.js'
    : 'cyweb@http://localhost:5500/remoteEntry.js'

  return {
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
        name: 'simplePanel',
        filename: 'remoteEntry.js',
        remotes: {
          // Import some data providers from the host application
          cyweb: cywebUrl,
        },
        exposes: {
          './SimplePanelApp': './src/SimplePanelApp',
          './SimplePanel': './src/components/SimplePanel.tsx',
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
}
