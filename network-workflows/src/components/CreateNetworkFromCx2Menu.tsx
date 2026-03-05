import { useNetworkApi } from 'cyweb/NetworkApi'

interface CreateNetworkFromCx2MenuProps {
  handleClose?: () => void
}

const sampleUrl =
  'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/development/docs/data/sample2.cx2'

const CreateNetworkFromCx2Menu = ({
  handleClose,
}: CreateNetworkFromCx2MenuProps): JSX.Element => {
  const networkApi = useNetworkApi()

  const fetchCx2fromURL = async (url: string): Promise<any[]> => {
    const response = await fetch(url)
    return await response.json()
  }

  const handleClick = (): void => {
    fetchCx2fromURL(sampleUrl).then((cx2) => {
      const result = networkApi.createNetworkFromCx2({
        cxData: cx2,
        navigate: true,
        addToWorkspace: true,
      })
      if (!result.success) {
        console.error(result.error.message)
      }
    })
    handleClose && handleClose()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        width: '100%',
        padding: '0.75rem 1rem',
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      Create a network from remote CX2
    </button>
  )
}

export default CreateNetworkFromCx2Menu
