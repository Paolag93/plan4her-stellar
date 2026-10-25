import { CustomPickerEntry, useCustomPicker } from '../../components/CustomPickerEntry'
import { pickerTimeMinutes } from '../../components/pickerValues'
import { useDialogFocus } from '../../components/useDialogFocus'
import './EditBlockSelectorOverlay.css'

const options = ['10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM']
export function EditBlockStartOverlay({ selected, onClose, onSelect, allowCustom = false }: { selected: string; onClose: () => void; onSelect: (value: string) => void; allowCustom?: boolean }) {
  const dialogRef = useDialogFocus(onClose)
  const { custom, setCustom, draft, setDraft, customButtonRef } = useCustomPicker(selected)
  return <div className="edit-block-overlay-layer"><section ref={dialogRef} className={`edit-block-selector-overlay ${custom ? 'edit-block-selector-overlay--custom' : ''}`} role="dialog" aria-modal="true" aria-label="Start time" data-figma-node="4701:7936">
    <h2>Start time</h2>
    {allowCustom && !custom ? <button ref={customButtonRef} type="button" className="picker-custom-toggle" onClick={() => setCustom(true)}>Custom</button> : null}
    <button className="edit-block-selector-overlay__close" type="button" onClick={onClose} aria-label="Close start time">×</button>
    {custom ? <CustomPickerEntry kind="time" selected={selected} draft={draft} onDraftChange={setDraft} onApply={onSelect} onBack={() => setCustom(false)} /> : <div className="edit-block-selector-overlay__options">{options.map(option => {
      const selectedOption = pickerTimeMinutes(selected) === pickerTimeMinutes(option)
      return <button type="button" key={option} aria-pressed={selectedOption} className={`edit-block-selector-overlay__option ${allowCustom && selectedOption ? 'edit-block-selector-overlay__option--blue' : ''}`} onClick={() => onSelect(option)}><span>{option}</span>{(allowCustom ? selectedOption : option === '11:30 AM') ? <svg className="edit-block-selector-overlay__check" viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3 3 7-7" /></svg> : null}</button>
    })}</div>}
  </section></div>
}
