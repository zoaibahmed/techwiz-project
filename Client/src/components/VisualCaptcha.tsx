import { useState, useEffect, useRef } from "react";
import { RotateCcw, Check, ShieldCheck } from "lucide-react";

interface VisualCaptchaProps {
  onVerify: (verified: boolean) => void;
  verified: boolean;
  label?: string;
  hint?: string;
}

// Characters that avoid visual ambiguity (no 0/O, 1/I/l)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 5): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export function VisualCaptcha({ onVerify, verified, label = "Security Verification", hint = "Enter the 5 characters shown below" }: VisualCaptchaProps) {
  const [code, setCode] = useState(() => generateCode());
  const [userInput, setUserInput] = useState("");
  const [inputError, setInputError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw canvas whenever code changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Solid background (NO gradients per master rules)
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, width, height);

    // Decorative noise lines (solid colors)
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 === 0 ? "#cbd5e1" : "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      );
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#64748b" : "#94a3b8";
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render characters with subtle random rotation & offset
    const charSpacing = width / (code.length + 1);
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.textBaseline = "middle";

    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const x = (i + 1) * charSpacing;
      const y = height / 2 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 24 - 12) * (Math.PI / 180);
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Dark solid colors for maximum contrast
      ctx.fillStyle = i % 2 === 0 ? "#0f172a" : "#1e293b";
      ctx.fillText(code[i], -8, 0);
      ctx.restore();
    }
  }, [code]);

  const refreshCode = () => {
    const next = generateCode();
    setCode(next);
    setUserInput("");
    setInputError("");
    onVerify(false);
  };

  const handleChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setUserInput(upper);
    setInputError("");

    if (upper === code) {
      onVerify(true);
    } else {
      if (verified) onVerify(false);
      if (upper.length === code.length && upper !== code) {
        setInputError("Code does not match. Try again.");
      }
    }
  };

  return (
    <div className="visual-captcha-wrapper" style={{ margin: "16px 0", padding: "16px", border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "8px", background: "var(--color-surface, #ffffff)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-heading, #1e293b)", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={16} /> {label}
        </span>
        {verified && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "12px" }}>
            <Check size={13} /> Verified
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <canvas
          ref={canvasRef}
          width={180}
          height={48}
          style={{
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
            background: "#f3f4f6",
          }}
          aria-label="Security verification code image"
        />
        <button
          type="button"
          onClick={refreshCode}
          title="Get a new verification code"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            padding: 0,
            border: "1px solid var(--color-border, #cbd5e1)",
            borderRadius: "6px",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-text, #475569)",
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <input
          type="text"
          maxLength={code.length}
          value={userInput}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter code shown above"
          autoComplete="off"
          style={{
            padding: "8px 12px",
            fontSize: "0.95rem",
            letterSpacing: "0.15em",
            fontFamily: "monospace",
            textTransform: "uppercase",
            border: verified ? "1px solid #16a34a" : inputError ? "1px solid #dc2626" : "1px solid var(--color-border, #cbd5e1)",
            borderRadius: "6px",
            background: verified ? "#f0fdf4" : "transparent",
            width: "100%",
            boxSizing: "border-box",
          }}
          aria-label={label}
        />
        {hint && !inputError && !verified && (
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
            {hint}
          </p>
        )}
        {inputError && (
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#dc2626" }} role="alert">
            {inputError}
          </p>
        )}
      </div>
    </div>
  );
}
