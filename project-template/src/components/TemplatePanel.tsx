import { useCallback, useEffect, useState } from 'react'

import { useCyWebEvent } from 'cyweb/EventBus'
import { useTableApi } from 'cyweb/TableApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

const EXAMPLE_NETWORK_NAME = 'Template App Example Network'

const sectionStyle = {
  padding: '1rem',
  borderRadius: '0.75rem',
  border: '1px solid #d7dce5',
  background: '#ffffff',
}

const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#5f6b7a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const valueStyle = {
  marginTop: '0.25rem',
  fontSize: '1rem',
  color: '#1d2430',
}

interface PanelSnapshot {
  workspaceName: string
  workspaceId: string
  networkCount: number
  currentNetworkId: string
  currentNodeCount: number
  currentEdgeCount: number
  exampleNodeName: string
  lastUpdatedLabel: string
}

const EMPTY_SNAPSHOT: PanelSnapshot = {
  workspaceName: '(untitled)',
  workspaceId: '(not set)',
  networkCount: 0,
  currentNetworkId: 'No network is currently selected',
  currentNodeCount: 0,
  currentEdgeCount: 0,
  exampleNodeName: 'Create the example network from the menu first.',
  lastUpdatedLabel: 'Waiting for host data',
}

const TemplatePanel = (): JSX.Element => {
  const [message, setMessage] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<PanelSnapshot>(EMPTY_SNAPSHOT)

  const workspaceApi = useWorkspaceApi()
  const tableApi = useTableApi()

  const refreshSnapshot = useCallback((): void => {
    const workspaceInfoResult = workspaceApi.getWorkspaceInfo()
    const networkListResult = workspaceApi.getNetworkList()
    const currentNetworkResult = workspaceApi.getCurrentNetworkId()

    let workspaceName = EMPTY_SNAPSHOT.workspaceName
    let workspaceId = EMPTY_SNAPSHOT.workspaceId
    let networkCount = 0

    if (workspaceInfoResult.success) {
      workspaceName = workspaceInfoResult.data.name || '(untitled)'
      workspaceId = workspaceInfoResult.data.workspaceId || '(not set)'
      networkCount = workspaceInfoResult.data.networkCount
    }

    let currentNetworkId = EMPTY_SNAPSHOT.currentNetworkId
    let currentNodeCount = 0
    let currentEdgeCount = 0

    if (currentNetworkResult.success) {
      currentNetworkId = currentNetworkResult.data.networkId
      const currentSummaryResult = workspaceApi.getNetworkSummary(
        currentNetworkResult.data.networkId,
      )

      if (currentSummaryResult.success) {
        currentNodeCount = currentSummaryResult.data.nodeCount
        currentEdgeCount = currentSummaryResult.data.edgeCount
      }
    }

    let exampleNodeName = EMPTY_SNAPSHOT.exampleNodeName

    if (networkListResult.success) {
      const exampleNetwork = networkListResult.data.find(
        (network) => network.name === EXAMPLE_NETWORK_NAME,
      )

      if (exampleNetwork !== undefined) {
        const exampleRowResult = tableApi.getRow(
          exampleNetwork.networkId,
          'node',
          '0',
        )

        if (exampleRowResult.success) {
          const rowName = exampleRowResult.data.row.name
          exampleNodeName =
            typeof rowName === 'string'
              ? rowName
              : JSON.stringify(exampleRowResult.data.row)
        } else {
          exampleNodeName = exampleRowResult.error.message
        }
      }
    }

    setSnapshot({
      workspaceName,
      workspaceId,
      networkCount,
      currentNetworkId,
      currentNodeCount,
      currentEdgeCount,
      exampleNodeName,
      lastUpdatedLabel: new Date().toLocaleTimeString(),
    })
  }, [tableApi, workspaceApi])

  useEffect(() => {
    refreshSnapshot()
  }, [refreshSnapshot])

  const handleHostChange = useCallback((): void => {
    refreshSnapshot()
  }, [refreshSnapshot])

  useCyWebEvent('network:created', handleHostChange)
  useCyWebEvent('network:deleted', handleHostChange)
  useCyWebEvent('network:switched', handleHostChange)
  useCyWebEvent('data:changed', handleHostChange)

  const handleSwitchNetwork = (): void => {
    const networkListResult = workspaceApi.getNetworkList()
    const currentNetworkResult = workspaceApi.getCurrentNetworkId()

    if (!networkListResult.success || networkListResult.data.length < 2) {
      setMessage('Open at least two networks to try switchCurrentNetwork().')
      return
    }

    if (!currentNetworkResult.success) {
      setMessage(currentNetworkResult.error.message)
      return
    }

    const currentIndex = networkListResult.data.findIndex(
      (network) => network.networkId === currentNetworkResult.data.networkId,
    )

    const nextNetwork =
      currentIndex === -1
        ? networkListResult.data[0]
        : networkListResult.data[
            (currentIndex + 1) % networkListResult.data.length
          ]

    const switchResult = workspaceApi.switchCurrentNetwork(
      nextNetwork.networkId,
    )
    setMessage(
      switchResult.success
        ? `Switched to network ${nextNetwork.networkId}.`
        : switchResult.error.message,
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.25rem',
        background: '#f4f7fb',
        color: '#1d2430',
      }}
    >
      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Project Template</h2>
        <p style={{ margin: '0.75rem 0 0', lineHeight: 1.6 }}>
          This template uses only the current App APIs. It reads workspace and
          table data through public APIs, then refreshes on host events through
          the EventBus.
        </p>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>
          Workspace API example
        </h3>
        <p style={{ marginTop: 0, lineHeight: 1.6 }}>
          Use <code>WorkspaceApi</code> for workspace metadata, network lists,
          summaries, and navigation. The panel re-reads this data whenever the
          host changes.
        </p>

        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          }}
        >
          <div>
            <div style={labelStyle}>Workspace Name</div>
            <div style={valueStyle}>{snapshot.workspaceName}</div>
          </div>
          <div>
            <div style={labelStyle}>Workspace Id</div>
            <div style={valueStyle}>{snapshot.workspaceId}</div>
          </div>
          <div>
            <div style={labelStyle}>Network Count</div>
            <div style={valueStyle}>{snapshot.networkCount}</div>
          </div>
          <div>
            <div style={labelStyle}>Current Network</div>
            <div style={valueStyle}>{snapshot.currentNetworkId}</div>
          </div>
          <div>
            <div style={labelStyle}>Current Node Count</div>
            <div style={valueStyle}>{snapshot.currentNodeCount}</div>
          </div>
          <div>
            <div style={labelStyle}>Current Edge Count</div>
            <div style={valueStyle}>{snapshot.currentEdgeCount}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwitchNetwork}
          style={{
            marginTop: '1rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '0.5rem',
            border: '1px solid #9bb0ca',
            background: '#e8f0fb',
            cursor: 'pointer',
          }}
        >
          Switch to next network
        </button>

        {message !== null ? (
          <p style={{ marginBottom: 0, marginTop: '0.75rem' }}>{message}</p>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Table API example</h3>
        <p style={{ marginTop: 0, lineHeight: 1.6 }}>
          After you create the example network from the menu, the panel reads
          the first node row through <code>TableApi.getRow()</code>. This shows
          the replacement for direct table store access.
        </p>

        <div>
          <div style={labelStyle}>Example Node Name</div>
          <div style={valueStyle}>{snapshot.exampleNodeName}</div>
        </div>

        <p style={{ marginBottom: 0, marginTop: '0.75rem', lineHeight: 1.6 }}>
          Last refreshed from host events: {snapshot.lastUpdatedLabel}
        </p>
      </section>
    </div>
  )
}

export default TemplatePanel
