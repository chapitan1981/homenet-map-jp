import { DEVICE_ICON_OPTIONS, deviceIcon } from '../utils/deviceIcon';

type Props = {
  value?: string;
  onChange: (value: string) => void;
};

export default function IconPicker({ value = '', onChange }: Props){
  const groups = Array.from(new Set(DEVICE_ICON_OPTIONS.map(opt => opt.group || 'その他')));

  return <div className="icon-picker">
    <div className="icon-picker-current">
      <span className="icon-picker-preview">{deviceIcon(value)}</span>
      <select value={value || ''} onChange={e=>onChange(e.target.value)}>
        <option value="">アイコン：自動判定</option>
        {groups.map(group=><optgroup key={group} label={group}>
          {DEVICE_ICON_OPTIONS.filter(opt=>(opt.group || 'その他')===group).map(opt=>
            <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
          )}
        </optgroup>)}
      </select>
    </div>
  </div>;
}
