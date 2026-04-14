import React from "react";
import { FaGithub, FaTimes } from "react-icons/fa";
import CustomBottom from "../Bottom";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 12, 0.7)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 60,
};

const CustomModal = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

  const previewImage = Array.isArray(project.images) ? project.images[0] : null;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "min(92vw, 760px)",
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          padding: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
            {project.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-dark)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <FaTimes />
          </button>
        </div>

        {previewImage ? (
          <img
            src={previewImage}
            alt={project.title}
            style={{
              width: "100%",
              maxHeight: 320,
              objectFit: "cover",
              borderRadius: 18,
              marginBottom: 18,
            }}
          />
        ) : null}

        <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
          {project.description}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
          {project.githubLink ? (
            <a href={project.githubLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", width: "100%", maxWidth: 260 }}>
              <CustomBottom text="Open Project in GitHub" rigthIcon={<FaGithub />} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
