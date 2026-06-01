import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: 'router', position: { x: 100, y: 120 }, data: { label: 'ルーター' }, type: 'default' },
  { id: 'switch', position: { x: 360, y: 120 }, data: { label: '10GbEスイッチ' }, type: 'default' },
  { id: 'truenas', position: { x: 620, y: 60 }, data: { label: 'TrueNAS' }, type: 'default' },
  { id: 'mainpc', position: { x: 620, y: 200 }, data: { label: 'RTX5070 メインPC' }, type: 'default' }
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'router', target: 'switch', label: 'LAN' },
  { id: 'e2', source: 'switch', target: 'truenas', label: '10GbE' },
  { id: 'e3', source: 'switch', target: 'mainpc', label: '10GbE' }
];

export default function DiagramPage() {
  return (
    <>
      <h2>構成図エディタ</h2>
      <div className="card">
        <p>現在はモック表示です。次工程でDB保存とノード追加機能を接続します。</p>
      </div>
      <div className="diagram-area">
        <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}
