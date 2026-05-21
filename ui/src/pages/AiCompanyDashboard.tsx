import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router";

interface StatCard {
  title: string;
  value: string | number;
  color: string;
  path: string;
}

export function AiCompanyDashboard() {
  const navigate = useNavigate();
  const [stats] = useState({
    activeProjects: 3,
    activeAgents: 8,
    completedProjects: 12,
    dailyCost: "$2.34",
  });

  const cards: StatCard[] = [
    { title: "进行中项目", value: stats.activeProjects, color: "#2e7d32", path: "/ai-company/projects" },
    { title: "在职 AI 员工", value: stats.activeAgents, color: "#1565c0", path: "/ai-company/agents" },
    { title: "已完成项目", value: stats.completedProjects, color: "#e65100", path: "/ai-company/projects?status=completed" },
    { title: "API 今日消耗", value: stats.dailyCost, color: "#6a1b9a", path: "/ai-company/costs" },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>AI Company Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => navigate(card.path)}
            style={{
              background: "#fff",
              border: `1px solid ${card.color}40`,
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>{card.title}</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>快速操作</h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => navigate("/ai-company/projects")}
            style={{ padding: "10px 20px", background: "#1565c0", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            + 新建项目
          </button>
          <button
            onClick={() => navigate("/ai-company/agents")}
            style={{ padding: "10px 20px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            + 添加员工
          </button>
        </div>
      </div>
    </div>
  );
}
