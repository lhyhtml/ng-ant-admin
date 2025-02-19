import {Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {LoginType} from "@app/pages/other-login/login1/login1.component";
import {Login1StoreService} from "@store/biz-store-service/other-login/login1-store.service";
import {takeUntil} from "rxjs/operators";
import {SpinService} from "@store/common-store/spin.service";
import {AuthKey, TokenPre} from "@config/constant";
import {AuthService} from "@store/common-store/auth.service";
import {Router} from "@angular/router";
import {WindowService} from "@core/services/common/window.service";
import {DestroyService} from "@core/services/common/destory.service";

@Component({
  selector: 'app-normal-login',
  templateUrl: './normal-login.component.html',
  styleUrls: ['./normal-login.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DestroyService]
})
export class NormalLoginComponent implements OnInit {
  validateForm!: FormGroup;
  passwordVisible = false;
  password?: string;
  typeEnum = LoginType;
  isOverModel = false;


  constructor(private destroy$: DestroyService, private authService: AuthService,
              private router: Router,
              private windowServe: WindowService,
              private spinService: SpinService, private cdr: ChangeDetectorRef, private fb: FormBuilder, private login1StoreService: Login1StoreService,) {
  }

  submitForm(): void {
    this.spinService.setCurrentGlobalSpinStore(true);
    /*模拟登录*/
    this.windowServe.setStorage(AuthKey, 'TokenPre + token');
    this.authService.setAuthCode(this.authService.parsToken(TokenPre));
    // if (!fnCheckForm(this.validateForm)) {
    //   return;
    // }
    setTimeout(() => {
      this.router.navigateByUrl('default/dashboard/analysis');
      this.spinService.setCurrentGlobalSpinStore(false);
    }, 100);
    return;
  }

  goOtherWay(type: LoginType): void {
    this.login1StoreService.setLoginTypeStore(type);
  }

  ngOnInit(): void {
    this.login1StoreService.getIsLogin1OverModelStore().pipe(takeUntil(this.destroy$)).subscribe((res => {
      this.isOverModel = res;
      this.cdr.markForCheck();
    }));
    this.validateForm = this.fb.group({
      userName: [null, [Validators.required]],
      password: [null, [Validators.required]],
      remember: [null],
    });
  }
}
