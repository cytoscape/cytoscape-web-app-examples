import { useNetworkApi } from 'cyweb/NetworkApi'

interface CreateNetworkMenuProps {
  handleClose?: () => void
}

/**
 * Add a menu item to create a small network with a view
 *
 * @param handleClose
 * @returns
 */
const CreateNetworkMenu = ({
  handleClose,
}: CreateNetworkMenuProps): JSX.Element => {
  const networkApi = useNetworkApi()

  const handleClick = (): void => {
    const result = networkApi.createNetworkFromEdgeList({
      name: 'Created by network-workflows App',
      description: 'This network was created by network-workflows app',
      edgeList: [
        ['A', 'B', 'type1'],
        ['B', 'C', 'type2'],
        ['C', 'A', 'type1'],
      ],
      addToWorkspace: true,
    })

    if (!result.success) {
      console.error(result.error.message)
      return
    }

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
      Create an example network
    </button>
  )
}

export default CreateNetworkMenu
