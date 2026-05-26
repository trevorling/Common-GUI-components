import { FC } from "react"
import { MdClose } from "react-icons/md";
import './FilterTag.scss';

type FilterTagProps = {
  readonly text: string;
  readonly onClick: () => void;
}

export const FilterTag: FC<FilterTagProps> = ({ text, onClick }) => {
  return <>
    <button className="filter-tag" type="button" onClick={onClick}>
      {text} <MdClose size="16" className="icon" />
    </button>
  </>
}
