// Who added and last changed a record, in a detail page's summary panel (R46).
type Props = { createdBy: string; updatedBy: string };

export function AddedBy({ createdBy, updatedBy }: Props) {
  return (
    <dl className="facts added-by">
      <div>
        <dt>Added by</dt>
        <dd>{createdBy}</dd>
      </div>
      <div>
        <dt>Last changed by</dt>
        <dd>{updatedBy}</dd>
      </div>
    </dl>
  );
}
