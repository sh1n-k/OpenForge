type DashboardKillSwitchCardProps = {
  killSwitchEnabled: boolean;
  isToggling: boolean;
  operationalStateLabel: string;
  operationalStateDescription: string;
  operationalActionLabel: string;
  operationalActionClass: string;
  onToggle: () => void;
};

export function DashboardKillSwitchCard({
  killSwitchEnabled,
  isToggling,
  operationalStateLabel,
  operationalStateDescription,
  operationalActionLabel,
  operationalActionClass,
  onToggle,
}: DashboardKillSwitchCardProps) {
  return (
    <div
      className={`dashboard-killswitch ${
        killSwitchEnabled
          ? "dashboard-killswitch-off"
          : "dashboard-killswitch-on"
      }`}
    >
      <div className="dashboard-killswitch-body">
        <div className="dashboard-killswitch-indicator">
          <span
            className={`dashboard-killswitch-dot ${
              killSwitchEnabled
                ? "dashboard-killswitch-dot-off"
                : "dashboard-killswitch-dot-on"
            }`}
          />
          <span className="dashboard-killswitch-label">
            {operationalStateLabel}
          </span>
        </div>
        <p className="dashboard-killswitch-description">
          {operationalStateDescription}
        </p>
      </div>
      <button
        type="button"
        disabled={isToggling}
        onClick={onToggle}
        className={operationalActionClass}
      >
        {isToggling ? "변경 중..." : operationalActionLabel}
      </button>
    </div>
  );
}
