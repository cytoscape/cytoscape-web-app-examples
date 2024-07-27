interface SubPanelProps {
  message: string
  color: string
}

const SubPanel = ({ message, color }: SubPanelProps): JSX.Element => {
  return (
    <div>
      <h5 style={{ color: color }}>Sub Panel: {message}</h5>
    </div>
  )
}

export default SubPanel
