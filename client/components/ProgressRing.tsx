import { View, Text } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors } from "../lib/theme";

export default function ProgressRing({
  frac,
  color,
  size = 64,
  stroke = 7,
  label,
}: {
  frac: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, frac));
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={r} stroke={color} strokeWidth={stroke} fill="none" opacity={0.18} />
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - clamped)}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {label != null && (
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: size * 0.24 }}>{label}</Text>
      )}
    </View>
  );
}
