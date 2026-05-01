import { Text } from 'react-konva'

interface Attrs {
  currentTime: number
}

export default function Display(attrs: Attrs) {
  return (
    <Text
      text={`${attrs.currentTime}`}
      x={50}
      y={150}
      fontSize={40}
      stroke="green"
      fill="yellow"
      strokeWidth={3}
      fillAfterStrokeEnabled
    />
  )
}
