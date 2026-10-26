import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHost } from '@shared/ui/toast/toast-host';

@Component({
  selector: 'sts-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastHost],
  template: '<router-outlet /><sts-toast-host />',
})
export class App {}
