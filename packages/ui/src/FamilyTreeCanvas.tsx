import { useMemo } from 'react'
import type { InheritanceCase } from '@mirath/core'

interface Props {
  inheritanceCase: InheritanceCase
  onHeirSelect?: (heirId: string) => void
  readOnly?: boolean
}

interface TreeNode {
  id: string
  label: string
  relation: string
  gender: 'male' | 'female'
  children: TreeNode[]
  isDeceased?: boolean
}

function buildTree(ic: InheritanceCase): TreeNode {
  const root: TreeNode = {
    id: 'deceased',
    label: ic.deceased.name || 'Deceased',
    relation: 'deceased',
    gender: ic.deceased.gender,
    children: [],
    isDeceased: true,
  }

  // Group heirs by relationship category for cleaner tree layout
  const groups: Record<string, TreeNode[]> = {
    parents: [],
    spouses: [],
    children: [],
    siblings: [],
    others: [],
  }

  for (const heir of ic.heirs) {
    const node: TreeNode = {
      id: heir.id,
      label: heir.name,
      relation: heir.relation,
      gender: heir.gender,
      children: [],
    }

    if (['father', 'mother', 'paternal_grandfather', 'paternal_grandmother', 'maternal_grandmother'].includes(heir.relation)) {
      groups.parents.push(node)
    } else if (['husband', 'wife'].includes(heir.relation)) {
      groups.spouses.push(node)
    } else if (['son', 'daughter', 'son_of_son', 'daughter_of_son'].includes(heir.relation)) {
      groups.children.push(node)
    } else if (heir.relation.includes('brother') || heir.relation.includes('sister')) {
      groups.siblings.push(node)
    } else {
      groups.others.push(node)
    }
  }

  // Parents go above deceased, rest below/beside
  root.children = [
    ...groups.spouses,
    ...groups.children,
    ...groups.siblings,
    ...groups.others,
  ]

  // Parents are rendered separately above
  return root
}

const NODE_W = 140
const NODE_H = 56
const GAP_X = 24
const GAP_Y = 80

function layoutNodes(tree: TreeNode): { x: number; y: number; node: TreeNode; parentX?: number; parentY?: number }[] {
  const items: { x: number; y: number; node: TreeNode; parentX?: number; parentY?: number }[] = []

  function measure(n: TreeNode): number {
    if (n.children.length === 0) return NODE_W
    return n.children.reduce((sum, c) => sum + measure(c) + GAP_X, -GAP_X)
  }

  function place(n: TreeNode, x: number, y: number, px?: number, py?: number) {
    const totalW = measure(n)
    const cx = x + totalW / 2 - NODE_W / 2
    items.push({ x: cx, y, node: n, parentX: px, parentY: py })

    let childX = x
    for (const child of n.children) {
      const childW = measure(child)
      place(child, childX, y + NODE_H + GAP_Y, cx + NODE_W / 2, y + NODE_H)
      childX += childW + GAP_X
    }
  }

  place(tree, 0, 0)
  return items
}

export function FamilyTreeCanvas({ inheritanceCase, onHeirSelect, readOnly }: Props) {
  const tree = useMemo(() => buildTree(inheritanceCase), [inheritanceCase])
  const nodes = useMemo(() => layoutNodes(tree), [tree])

  const minX = Math.min(...nodes.map((n) => n.x))
  const maxX = Math.max(...nodes.map((n) => n.x + NODE_W))
  const maxY = Math.max(...nodes.map((n) => n.y + NODE_H))
  const svgW = maxX - minX + 40
  const svgH = maxY + 40
  const offsetX = -minX + 20

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ display: 'block', margin: '0 auto' }}>
        {/* Connector lines */}
        {nodes.map(({ x, y, node, parentX, parentY }) =>
          parentX != null && parentY != null ? (
            <line
              key={`line-${node.id}`}
              x1={parentX + offsetX}
              y1={parentY}
              x2={x + NODE_W / 2 + offsetX}
              y2={y}
              stroke="var(--color-border, #2a2a2a)"
              strokeWidth={2}
            />
          ) : null,
        )}
        {/* Nodes */}
        {nodes.map(({ x, y, node }) => {
          const isDeceasedNode = node.isDeceased
          const fill = isDeceasedNode
            ? 'var(--color-accent, #c9a96e)'
            : 'var(--color-surface, #1a1a1a)'
          const textColor = isDeceasedNode ? '#0f0f0f' : 'var(--color-text, #e8e8e8)'
          const stroke = isDeceasedNode ? 'var(--color-accent, #c9a96e)' : 'var(--color-border, #2a2a2a)'

          return (
            <g
              key={node.id}
              transform={`translate(${x + offsetX}, ${y})`}
              style={{ cursor: !readOnly && !isDeceasedNode ? 'pointer' : 'default' }}
              onClick={() => {
                if (!readOnly && !isDeceasedNode && onHeirSelect) {
                  onHeirSelect(node.id)
                }
              }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
              />
              <text
                x={NODE_W / 2}
                y={22}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={textColor}
              >
                {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
              </text>
              <text
                x={NODE_W / 2}
                y={42}
                textAnchor="middle"
                fontSize={10}
                fill={isDeceasedNode ? 'rgba(15,15,15,0.6)' : 'var(--color-muted, #888)'}
              >
                {node.relation.replace(/_/g, ' ')}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
