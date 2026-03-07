import path from 'path'
import url from 'url'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import packageJson from '../package.json' with { type: 'json' }

const { ModuleFederationPlugin } = webpack.container

// Extract some properties from the package.json file to avoid duplication
const deps = packageJson.peerDependencies

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEV_SERVER_PORT = 2222

export default (env = {}) => {
  // Extract the environment variables to modify URLs and other settings
  const isProduction = env.production || false
  const cywebUrl = isProduction
    ? 'cyweb@https://web.cytoscape.org/remoteEntry.js'
    : 'cyweb@http://localhost:5500/remoteEntry.js'

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: false,
    target: 'web',
    optimization: {
      runtimeChunk: false, // Required for Module Federation
      minimizer: [
        new TerserPlugin({
          extractComments: false, // Suppress .LICENSE.txt files in dist
        }),
      ],
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
        name: 'hello',
        filename: 'remoteEntry.js',
        remotes: {
          cyweb: cywebUrl,
        },
        exposes: {
          './AppConfig': './src/index.ts',
          './HelloPanel': './src/components/HelloPanel.tsx',
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
