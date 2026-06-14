import { formatJst } from '../utils/dateTime';

type Props = {
  value?: string | null;
};

export default function TimeText({ value }: Props){
  return <>{formatJst(value)}</>;
}
