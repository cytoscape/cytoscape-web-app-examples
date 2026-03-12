import { useNetworkApi } from 'cyweb/NetworkApi'

interface TemplateMenuItemProps {
  handleClose?: () => void
}

const TemplateMenuItem = ({
  handleClose,
}: TemplateMenuItemProps): JSX.Element => {
  const networkApi = useNetworkApi()

  const handleCreateNetwork = (): void => {
    const result = networkApi.createNetworkFromEdgeList({
      name: 'Template App Example Network',
      description:
        'Example network created from the project template menu item.',
      edgeList: [
        ['Template A', 'Template B', 'interacts-with'],
        ['Template B', 'Template C', 'interacts-with'],
        ['Template C', 'Template A', 'interacts-with'],
      ],
      addToWorkspace: true,
    })

    if (result.success) {
      handleClose?.()
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreateNetwork}
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
      Create example network
    </button>
  )
}

export default TemplateMenuItem
