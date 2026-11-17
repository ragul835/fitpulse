import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { ringColors } from "../lib/theme";

interface RingSpec {
  value: number;
  goal: number;
  color: string;
}

function arc(radius: number, frac: number) {
  const c = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, frac));
  return { c, offset: c * (1 - clamped) };
}

export default function ActivityRings({
  steps,
  calories,
  activeMinutes,
  size = 180,
}: {
  steps: { value: number; goal: number };
  calories: { value: number; goal: number };
  activeMinutes: { value: number; goal: number };
  size?: number;
}) {
  const stroke = size * 0.1;
  const gap = stroke * 0.55;
  const r1 = size / 2 - stroke / 2;
  const r2 = r1 - stroke - gap;
  const r3 = r2 - stroke - gap;

  const rings: { r: number; spec: RingSpec }[] = [
    { r: r1, spec: { ...steps, color: ringColors.steps } },
    { r: r2, spec: { ...calories, color: ringColors.calories } },
    { r: r3, spec: { ...activeMinutes, color: ringColors.activeMinutes } },
  ];

  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {rings.map(({ r, spec }, i) => {
            const { c, offset } = arc(r, spec.goal ? spec.value / spec.goal : 0);
            return (
              <G key={i}>
                <Circle cx={center} cy={center} r={r} stroke={spec.color} strokeWidth={stroke} fill="none" opacity={0.18} />
                <Circle
                  cx={center}
                  cy={center}
                  r={r}
                  stroke={spec.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
