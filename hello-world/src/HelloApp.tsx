interface CyApp {
  id: string
  name: string
  url: string
}

export const HelloApp: CyApp = {
  id: 'hello-cy-web',
  name: 'Hello Cy World App',
  url: 'http://localhost:3000/hello-cy-world.js',
}
