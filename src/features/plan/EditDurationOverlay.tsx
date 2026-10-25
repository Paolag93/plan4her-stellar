import { CustomPickerEntry, useCustomPicker } from '../../components/CustomPickerEntry'
import { useDialogFocus } from '../../components/useDialogFocus'
import './EditBlockSelectorOverlay.css'

const options = ['30 min', '45 min', '60 min', '90 min']
export function EditDurationOverlay({ selected, onClose, onSelect, allowCustom = false }: { selected: string; onClose: () => void; onSelect: (value: string) => void; allowCustom?: boolean }) {
  const dialogRef = useDialogFocus(onClose)
  const { custom, setCustom, draft, setDraft, customButtonRef } = useCustomPicker(selected)
  return <div className="edit-block-overlay-layer"><section ref={dialogRef} className={`edit-block-selector-overlay ${custom ? 'edit-block-selector-overlay--custom' : ''}`} role="dialog" aria-modal="true" aria-label="Duration" data-figma-node="4701:7956">
    <h2>Duration</h2>
    {allowCustom && !custom ? <button ref={customButtonRef} type="button" className="picker-custom-toggle" onClick={() => setCustom(true)}>Custom</button> : null}
    <button className="edit-block-selector-overlay__close" type="button" onClick={onClose} aria-label="Close duration">×</button>
    {custom ? <CustomPickerEntry kind="duration" selected={selected} draft={draft} onDraftChange={setDraft} onApply={onSelect} onBack={() => setCustom(false)} /> : <div className="edit-block-selector-overlay__options">{options.map(option => {
      const blue = allowCustom ? selected === option : option === '90 min'
      const checked = allowCustom ? selected === option : option === '60 min' || option === '90 min'
      return <button type="button" key={option} aria-pressed={selected === option} className={blue ? 'edit-block-selector-overlay__option edit-block-selector-overlay__option--blue' : 'edit-block-selector-overlay__option'} onClick={() => onSelect(option)}><span>{option}</span>{checked ? <svg className="edit-block-selector-overlay__check" viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3 3 7-7" /></svg> : null}</button>
    })}</div>}
  </section></div>
}
