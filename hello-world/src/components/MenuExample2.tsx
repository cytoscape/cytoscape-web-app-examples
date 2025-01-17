import { MenuItem } from '@mui/material'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'

interface MenuExample2Props {
  handleClose?: () => void
}

const sampleUrl =
  'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/pre-release-cleanup/docs/data/sample2.cx2'

const MenuExample2 = ({ handleClose }: MenuExample2Props): JSX.Element => {
  const createNetworkFromCx2 = useCreateNetworkFromCx2()
  const fetchCx2fromURL = async (url: string): Promise<any> => {
    const response = await fetch(url)
    const cx2 = await response.json()
    console.log('From CX2', cx2)
    return cx2
  }

  const handleClick = (): void => {
    fetchCx2fromURL(sampleUrl).then((cx2) => {
      const networkWithView = createNetworkFromCx2({ cxData: cx2 })
      console.log('Sample network created from CX2', networkWithView)
    })
    handleClose && handleClose()
  }

  return (
    <MenuItem onClick={handleClick}>Create a network from remote CX2</MenuItem>
  )
}

export default MenuExample2
