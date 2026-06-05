import { FC } from "react";

type MetadataItemProps = {
  readonly label: string,
  readonly value: string
};

const ChatMetadataPanelItem: FC<MetadataItemProps> = ({ label, value }) => {
  return <>
    <p>
      <strong>{label}</strong>
    </p>
    <p>{value}</p>
  </>;
}

export { ChatMetadataPanelItem };
