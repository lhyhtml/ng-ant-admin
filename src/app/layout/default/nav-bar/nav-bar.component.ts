import {Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input, Inject} from '@angular/core';
import {filter, map, mergeMap, share, switchMap, takeUntil, tap} from 'rxjs/operators';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {ThemeService} from '@store/common-store/theme.service';
import {Title} from '@angular/platform-browser';
import {SplitNavStoreService} from '@store/common-store/split-nav-store.service';
import {Menu} from "@core/services/types";
import {DOCUMENT} from "@angular/common";
import {MENU_TOKEN} from "@config/menu";
import {AuthService} from "@store/common-store/auth.service";
import {TabService} from "@core/services/common/tab.service";
import {DestroyService} from "@core/services/common/destory.service";
import {Observable} from "rxjs";

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DestroyService]
})
export class NavBarComponent implements OnInit {
  // 是混合模式顶部导航
  @Input() isMixiHead = false;
  @Input() isMixiLeft = false;
  routerPath = this.router.url;
  themesMode: 'side' | 'top' | 'mixi' = 'side';
  themesOptions$ = this.themesService.getThemesMode();
  isNightTheme$ = this.themesService.getIsNightTheme();
  isCollapsed$ = this.themesService.getIsCollapsed();
  isOverMode$ = this.themesService.getIsOverMode();
  leftMenuArray$ = this.splitNavStoreService.getSplitLeftNavArrayStore();
  isOverMode = false;
  isCollapsed = false;
  isMixiMode = false;
  leftMenuArray: Menu[] = [];
  copyMenus: Menu[] = this.cloneMenuArray(this.menus);
  authCodeArray: string[] = [];
  subTheme$: Observable<any>;

  constructor(private router: Router,
              private destroy$: DestroyService,
              private authService: AuthService,
              @Inject(MENU_TOKEN) public menus: Menu[],
              private splitNavStoreService: SplitNavStoreService,
              private activatedRoute: ActivatedRoute, private tabService: TabService,
              private cdr: ChangeDetectorRef, private themesService: ThemeService,
              private titleServe: Title, @Inject(DOCUMENT) private doc: Document) {
    this.subTheme$ = this.isOverMode$.pipe(switchMap(res => {
      this.isOverMode = res;
      return this.themesOptions$;
    }), tap(options => {
      this.themesMode = options.mode;
      this.isMixiMode = this.themesMode === 'mixi';
    }), share(), takeUntil(this.destroy$));

    // 监听混合模式下左侧菜单数据源
    this.subMixiModeSideMenu();
    // 监听折叠菜单事件
    this.subIsCollapsed();
    this.subAuth();
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        tap(() => {
          this.subTheme$.subscribe(() => {
            // 主题切换为混合模式下，设置左侧菜单数据源
            // 如果放在ngInit监听里面，会在混合模式下，刷新完页面切换路由，runOutSideAngular
            if (this.isMixiMode) {
              this.setMixModeLeftMenu();
            }
          })
          // @ts-ignore
          this.routerPath = this.activatedRoute.snapshot['_routerState'].url;
          this.clickMenuItem(this.menus);
          this.clickMenuItem(this.copyMenus);
          // 是折叠的菜单并且不是over菜单,解决折叠左侧菜单时，切换tab会有悬浮框菜单的bug
          if (this.isCollapsed && !this.isOverMode) {
            this.closeMenuOpen(this.menus);
          }

          // 顶部菜单模式，并且不是over模式，解决顶部模式时，切换tab会有悬浮框菜单的bug
          if (this.themesMode === 'top' && !this.isOverMode) {
            this.closeMenu();
          }
        }),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter((route) => {
          return route.outlet === 'primary';
        }),
        mergeMap((route) => {
          return route.data;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((routeData) => {
        // 详情页是否是打开新tab页签形式
        let isNewTabDetailPage = routeData['newTab'] === 'true';
        this.tabService.addTab({
          title: routeData['title'],
          path: this.routerPath,
          relatedLink: routeData['relatedLink'] ? routeData['relatedLink'] : [],
        }, isNewTabDetailPage);
        this.tabService.findIndex(this.routerPath);
        this.titleServe.setTitle(routeData['title'] + ' - Ant Design');
        // 混合模式时，切换tab，让左侧菜单也相应变化
        this.setMixModeLeftMenu();
      });
  }

  // 设置混合模式时，左侧菜单"自动分割菜单"模式的数据源
  setMixModeLeftMenu(): void {
    this.menus.forEach(item => {
      if (item.selected) {
        this.splitNavStoreService.setSplitLeftNavArrayStore(item.children!);
      }
    });
  }


  // 深拷贝克隆菜单数组
  cloneMenuArray(sourceMenuArray: Menu[], target: Menu[] = []): Menu[] {
    sourceMenuArray.forEach(item => {
      const obj: Menu = {title: "", path: '', showIcon: false};
      for (let i in item) {
        if (item.hasOwnProperty(i)) {
          // @ts-ignore
          if (Array.isArray(item[i])) {
            // @ts-ignore
            obj[i] = this.cloneMenuArray(item[i]);
          } else {
            // @ts-ignore
            obj[i] = item[i];
          }
        }
      }
      target.push({...obj});
    })
    return target;
  }


  // 混合模式点击一级菜单，要让一级菜单下的第一个子菜单被选中
  changTopNav(index: number): void {
    // 当前选中的第一级菜单对象
    const currentTopNav = this.menus[index];
    if (currentTopNav.children && currentTopNav.children.length > 0) {
      // 当前左侧导航数组
      /*添加了权限版*/
      let currentLeftNavArray = currentTopNav.children;
      currentLeftNavArray = currentLeftNavArray.filter(item => {
        return this.authCodeArray.includes(item.actionCode!);
      });
      if (currentLeftNavArray.length > 0 && !currentLeftNavArray[0].children) {
        this.router.navigateByUrl(currentLeftNavArray[0].path!);
      } else if (currentLeftNavArray.length > 0 && currentLeftNavArray[0].children) {
        this.router.navigateByUrl(currentLeftNavArray[0].children[0].path!);
      }
      this.splitNavStoreService.setSplitLeftNavArrayStore(currentLeftNavArray);
      /*添加了权限版结束*/
      /*注释的是没有权限版*/
      // const currentLeftNavArray = currentTopNav.children;
      // if (!currentLeftNavArray[0].children) {
      //   this.router.navigateByUrl(currentLeftNavArray[0].path!);
      //   this.splitNavStoreService.setSplitLeftNavArrayStore(currentLeftNavArray);
      // } else {
      //   this.router.navigateByUrl(currentLeftNavArray[0].children[0].path!);
      //   this.splitNavStoreService.setSplitLeftNavArrayStore(currentLeftNavArray);
      // }
    }
  }

  flatMenu(menus: Menu[], routePath: string): void {
    menus.forEach(item => {
      item.selected = false;
      item.open = false;
      if (routePath.includes(item.path) && !item.isNewLink) {
        item.selected = true;
        item.open = true;
      }
      if (!!item.children && item.children.length > 0) {
        this.flatMenu(item.children, routePath)
      }
    })


  }

  clickMenuItem(menus: Menu[]): void {
    if (!menus) {
      return;
    }
    const index = this.routerPath.indexOf('?') === -1 ? this.routerPath.length : this.routerPath.indexOf('?');
    const routePath = this.routerPath.substring(0, index);
    this.flatMenu(menus, routePath);
    this.cdr.markForCheck();
  }

  // 改变当前菜单展示状态
  changeOpen(currentMenu: Menu, allMenu: Menu[]): void {
    allMenu.forEach((item) => {
      item.open = false;
    });
    currentMenu.open = true;
  }

  closeMenuOpen(menus: Menu[]): void {
    menus.forEach(menu => {
      menu.open = false;
      if (menu.children && menu.children.length > 0) {
        this.closeMenuOpen(menu.children);
      } else {
        return;
      }
    });
  }

  changeRoute(menu: Menu): void {
    if (menu.isNewLink) {
      this.menus = this.cloneMenuArray(this.copyMenus);
      if (this.themesMode === 'top' && !this.isOverMode) {
        this.closeMenu();
      }
      this.doc.body.click();
      window.open(menu.path, '_blank');
      return;
    }
    this.router.navigate([menu.path]);
  }

  // 监听折叠菜单事件
  subIsCollapsed(): void {
    this.isCollapsed$.subscribe(isCollapsed => {
      this.isCollapsed = isCollapsed;
      // 菜单展开
      if (!this.isCollapsed) {
        this.menus = this.cloneMenuArray(this.copyMenus);
        this.clickMenuItem(this.menus);
        // 混合模式下要在点击一下左侧菜单数据源,不然有二级菜单的菜单在折叠状态变为展开时，不open
        if (this.themesMode === "mixi") {
          this.clickMenuItem(this.leftMenuArray);
        }
      } else { // 菜单收起
        this.copyMenus = this.cloneMenuArray(this.menus);
        this.closeMenuOpen(this.menus);
      }
      this.cdr.markForCheck();
    });
  }

  closeMenu(): void {
    this.clickMenuItem(this.menus);
    this.clickMenuItem(this.copyMenus);
    this.closeMenuOpen(this.menus);
  }

  subAuth(): void {
    this.authService.getAuthCode().pipe(takeUntil(this.destroy$)).subscribe(res => this.authCodeArray = res);
  }

  // 监听混合模式下左侧菜单数据源
  private subMixiModeSideMenu() {
    this.leftMenuArray$.pipe(takeUntil(this.destroy$)).subscribe(res => {
      this.leftMenuArray = res;
    })
  }

  ngOnInit(): void {
    // 顶部模式时要关闭menu的open状态
    this.subTheme$.subscribe((options) => {
      if (options.mode === 'top' && !this.isOverMode) {
        this.closeMenu();
      }
    })
  }
}
