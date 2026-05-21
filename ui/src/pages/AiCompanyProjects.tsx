import { useNavigate } from "@/lib/router";

export function AiCompanyProjects() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>项目列表</h1>
      <p style={{ color: "#666" }}>项目功能正在集成中。使用 CLI 命令 <code>ai-company project new &lt;描述&gt;</code> 创建项目。</p>
      <button
        onClick={() => navigate("/ai-company")}
        style={{ marginTop: "16px", padding: "8px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
      >
        ← 返回 Dashboard
      </button>
    </div>
  );
}
