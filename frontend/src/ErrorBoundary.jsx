import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error capturado en el editor:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'white', textAlign: 'center' }}>
          <h2>Error al cargar el editor</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => {
            this.setState({ hasError: false, error: null });
            if (this.props.onBack) this.props.onBack();
          }}>
            Volver
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}