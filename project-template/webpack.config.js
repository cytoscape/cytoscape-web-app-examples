import path from 'path'
import url from 'url'
import webpack from 'webpack'
import packageJson from '../package.json' with { type: 'json' }

const { ModuleFederationPlugin } = webpack.container

// Extract some properties from the package.json file to avoid duplication
const deps = packageJson.peerDependencies

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// TODO: Change DEV_SERVER_PORT to an unused port.
const DEV_SERVER_PORT = 5555

// Host remote URL — switches between local dev and production.
const CYWEB_NAME = 'cyweb'
const LOCAL_CYWEB = `${CYWEB_NAME}@http://localhost:5500/remoteEntry.js`
const PROD_CYWEB = `${CYWEB_NAME}@https://web.cytoscape.org/remoteEntry.js`

export default (env) => ({
  mode: env?.production ? 'production' : 'development',
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
      name: 'createNetwork', // TODO: Change to your unique camelCase app name.
      filename: 'remoteEntry.js',
      remotes: {
        cyweb: env?.production ? PROD_CYWEB : LOCAL_CYWEB,
      },
      exposes: {
        './AppConfig': './src/index.ts',
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
})
